import { getCategories } from "@/lib/actions";
import { CreateTopicForm } from "./CreateTopicForm";

export const dynamic = "force-dynamic";

export default async function NewTopicPage() {
  const categories = await getCategories();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Create New Myth</h1>
        <p className="text-sm text-zinc-500 mt-1">Submit a new conspiracy or myth for investigation</p>
      </div>

      <div className="max-w-2xl">
        <CreateTopicForm categories={categories} />
      </div>
    </div>
  );
}
