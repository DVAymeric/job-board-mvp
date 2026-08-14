import { auth } from "@/auth";
import { AccountView } from "@/components/account/account-view";

export default async function AccountPage() {
  const session = await auth();

  return (
    <div className="flex flex-1 flex-col p-4">
      <AccountView email={session?.user?.email ?? ""} />
    </div>
  );
}
