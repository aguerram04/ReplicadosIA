import SessionDebug from "@/components/auth/SessionDebug";

export const metadata = { title: "Session Debug" };

export default function SessionPage() {
  return (
    <main className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Session</h1>
      <SessionDebug />
    </main>
  );
}
