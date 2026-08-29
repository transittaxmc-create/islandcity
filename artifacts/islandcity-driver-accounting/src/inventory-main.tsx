import { createRoot } from "react-dom/client";
import { ClerkProvider, Show, SignIn, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";

import MigrationInventory from "@/components/MigrationInventory";
import "./index.css";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function AuthenticatedInventory() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        <p className="text-center text-xs text-neutral-500">Verificando sesión…</p>
      </main>
    );
  }

  if (!isSignedIn || !user) return null;

  return (
    <main className="min-h-screen bg-black p-4 text-white sm:p-6">
      <div className="mx-auto max-w-3xl">
        <p className="mb-4 rounded-xl border border-[#4ade80]/25 bg-[#4ade80]/10 p-3 text-center text-[10px] font-bold text-[#86efac]">
          Modo de solo lectura: no se conectó al servidor y no se modificaron datos
        </p>
        <MigrationInventory userId={user.id} />
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl}>
    <Show when="signed-in">
      <AuthenticatedInventory />
    </Show>
    <Show when="signed-out">
      <main className="flex min-h-screen items-center justify-center bg-black p-4 text-white">
        <SignIn routing="hash" />
      </main>
    </Show>
  </ClerkProvider>,
);