import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { PayflowMark, PayflowWordmark } from "@/components/brand";
import { Btn, StatusPill } from "@/components/payflow-ui";
import { usePlatform } from "@/lib/platform-context";
import { PAYFLOW_PRODUCT_ID } from "@/lib/platform-data";
import { markSignedOut } from "@/lib/session";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Select a Product — Platform Access" },
      {
        name: "description",
        content:
          "Choose which product to open. Only products your organization is entitled to access are shown.",
      },
      { property: "og:title", content: "Select a Product — Platform Access" },
      {
        property: "og:description",
        content: "Product selection for entitled products in one authenticated session.",
      },
    ],
  }),
  component: ProductSelection,
});

function ProductSelection() {
  const { entitledProducts, currentOrganization, currentPerson } = usePlatform();
  const navigate = useNavigate();
  const [notice, setNotice] = useState<string | null>(null);

  const openProduct = (productId: string, productName: string) => {
    if (productId === PAYFLOW_PRODUCT_ID) {
      navigate({ to: "/" });
      return;
    }
    setNotice(`${productName} has no operational screens in this phase.`);
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex h-[68px] items-center justify-between border-b border-border/80 bg-background px-5 lg:px-10">
        <PayflowWordmark />
        <div className="flex items-center gap-2">
          <Link to="/platform">
            <Btn>Platform administration</Btn>
          </Link>
          <Btn
            variant="ghost"
            onClick={() => {
              markSignedOut();
              navigate({ to: "/login", replace: true });
            }}
          >
            Sign out
          </Btn>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1080px] px-5 py-12 lg:px-10">
        <p className="text-eyebrow">Platform access</p>
        <h1 className="font-display mt-2 text-[28px] leading-tight font-semibold text-foreground">
          Select a product
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
          {currentOrganization
            ? `Products ${currentOrganization.name} is entitled to access. `
            : ""}
          Roles, scope and permissions are managed inside each product.
        </p>
        {currentPerson && (
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">{currentPerson.name}</span> ·{" "}
            {currentPerson.email}
          </p>
        )}

        {notice && (
          <p className="mt-5 rounded-md border border-border bg-card px-3.5 py-2.5 text-[12.5px] text-foreground">
            {notice}
          </p>
        )}


        {entitledProducts.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-lg border border-dashed border-border-strong/60 bg-card px-6 py-14 text-center">
            <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border">
              <ShieldAlert className="size-5" />
            </span>
            <p className="text-[14px] font-semibold text-foreground">No products available</p>
            <p className="mt-1.5 max-w-md text-[12.5px] text-muted-foreground">
              Your organization is not currently entitled to any product. Contact your platform
              administrator to request access.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entitledProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => openProduct(product.id, product.name)}
                className="panel group flex flex-col items-start p-5 text-left transition-all duration-150 hover:border-border-strong hover:shadow-brand"
              >
                <div className="flex w-full items-center justify-between gap-3">
                  <PayflowMark className="size-9" />
                  <StatusPill tone="success" dot>
                    Available
                  </StatusPill>
                </div>
                <p className="mt-4 text-[15px] font-semibold text-foreground">{product.name}</p>
                <p className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary">
                  Enter {product.name}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
