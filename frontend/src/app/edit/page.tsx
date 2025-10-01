import { Suspense } from "react";
import EditImagePage from "@/components/EditImagePage";

function EditPageContent() {
  return <EditImagePage />;
}

export default function Edit() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <EditPageContent />
    </Suspense>
  );
}
