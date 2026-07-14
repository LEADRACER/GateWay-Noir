/**
 * Auto-Invite Module — WhatsApp Group Join via Invite Link
 *
 * Queries users who have registered a phone but haven't been invited
 * to the GLA census group yet. Sends them a group invite link via DM
 * (privacy-safe — works even when direct add is blocked).
 *
 * Called by the announcer every tick.
 */
const GROUP_ID = process.env.WHATSAPP_GROUP_JID || "120363426099852261@g.us";

export async function processGroupInvites(sock, supabase) {
  if (!GROUP_ID) {
    log("INVITE_SKIP", "WHATSAPP_GROUP_JID not set — skipping invites");
    return 0;
  }

  // Fetch users with phone set but no whatsappId (never invited)
  const { data, error } = await supabase
    .from("User")
    .select("id, phone, badgeCode, displayName")
    .not("phone", "is", null)
    .is("whatsappId", null)
    .limit(10);

  if (error) {
    log("INVITE_ERR", `query: ${error.message}`);
    return 0;
  }

  if (!data?.length) return 0;

  let invited = 0;

  for (const user of data) {
    const phone = user.phone.replace(/[^0-9]/g, "");
    const label = user.badgeCode || user.displayName || `User#${user.id}`;

    // Skip invalid-looking numbers
    if (phone.length < 7 || phone.length > 15) {
      log("INVITE_SKIP", `${label}: invalid phone "${user.phone}"`);
      await markInvited(supabase, user.id, "invalid");
      continue;
    }

    try {
      // Check WhatsApp registration
      log("INVITE_CHECK", `${label}: checking WhatsApp for ${phone}...`);
      const [waResult] = await sock.onWhatsApp(phone);
      if (!waResult?.exists) {
        log("INVITE_SKIP", `${label}: ${phone} not on WhatsApp`);
        await markInvited(supabase, user.id, "no-whatsapp");
        continue;
      }

      const userJid = waResult.jid; // e.g. "917XXXXXXX@s.whatsapp.net"

      // Check if already in group
      try {
        const groupMeta = await sock.groupMetadata(GROUP_ID);
        const alreadyMember = groupMeta.participants.some(
          p => p.id === userJid || p.id.split(":")[0] === userJid.split(":")[0]
        );
        if (alreadyMember) {
          log("INVITE_SKIP", `${label}: already in group`);
          await markInvited(supabase, user.id, userJid);
          continue;
        }
      } catch (e) {
        log("INVITE_WARN", `${label}: group metadata check failed: ${e.message}`);
      }

      // Get group invite code
      let inviteCode;
      try {
        inviteCode = await sock.groupInviteCode(GROUP_ID);
      } catch (e) {
        // If no invite code exists, revoke to create one
        log("INVITE_CODE", `${label}: revoking to get invite code...`);
        inviteCode = await sock.groupRevokeInvite(GROUP_ID);
      }
      const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

      // Send invite link via DM
      const inviteMsg = [
        "━━━ NOIR BUREAU ━━━", "",
        "You've been invited to join the GLA census group.", "",
        "Click the link below to join:",
        inviteLink, "",
        "— Noir:GateWay Bureau",
      ].join("\n");

      log("INVITE_DM", `${label}: sending invite to ${userJid}...`);
      await sock.sendMessage(userJid, { text: inviteMsg });
      log("INVITE_OK", `${label}: invite sent to ${userJid}`);

      await markInvited(supabase, user.id, userJid);
      invited++;
    } catch (e) {
      log("INVITE_FAIL", `${label}: ${e.message}`);
      // Leave unmarked — will retry on next tick
    }
  }

  return invited;
}

async function markInvited(supabase, userId, whatsappId) {
  await supabase
    .from("User")
    .update({ whatsappId, updatedAt: new Date().toISOString() })
    .eq("id", userId);
}

function log(tag, msg) {
  const ts = new Date().toISOString().replace("T", " ").substring(0, 19);
  console.log(`[${ts}] [INVITE/${tag}] ${msg}`);
}
