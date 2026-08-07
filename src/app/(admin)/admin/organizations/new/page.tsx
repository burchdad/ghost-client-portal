import {
  billingModelOptions,
  clientTypeOptions,
} from "@/lib/client-classification";
import { requireInternalRole } from "@/lib/auth/guards";
import { createManualClientAction } from "./actions";

export default async function NewOrganizationPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  await requireInternalRole(["FOUNDER", "ADMINISTRATOR", "ACCOUNT_MANAGER"]);
  const query = (await searchParams) ?? {};

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-line bg-panel p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-accent">
          Manual intake
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Add client</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          Create a client workspace without requiring a proposal or Stripe
          payment first. Use this for regular paying clients, trade clients,
          internal Ghost workspaces, and prospects that need portal access.
        </p>
      </div>

      {query.error ? (
        <p className="rounded-md border border-red-300/40 bg-red-950/30 px-4 py-3 text-sm text-red-100">
          {query.error}
        </p>
      ) : null}

      <form
        action={createManualClientAction}
        className="space-y-6 rounded-lg border border-line bg-panel p-5"
      >
        <section>
          <h2 className="text-xl font-semibold">Client classification</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Organization name" name="name" required />
            <Field label="Client since" name="clientSince" type="date" />
            <Select
              label="Client type"
              name="clientType"
              defaultValue="PAID_CLIENT"
              options={clientTypeOptions}
            />
            <Select
              label="Billing model"
              name="billingModel"
              defaultValue="PROJECT_BASED"
              options={billingModelOptions}
            />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Textarea
              label="Trade or barter terms"
              name="tradeTerms"
              placeholder="Example: Website maintenance exchanged for monthly media package."
            />
            <Textarea
              label="Internal notes"
              name="internalNotes"
              placeholder="Visible to Ghost admins only."
            />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Primary contact</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Contact name" name="primaryContactName" required />
            <Field
              label="Contact email"
              name="primaryContactEmail"
              type="email"
              required
            />
            <Field label="Contact title" name="primaryContactTitle" />
            <Field label="Contact phone" name="primaryContactPhone" />
            <Field label="Billing contact name" name="billingContactName" />
            <Field
              label="Billing contact email"
              name="billingContactEmail"
              type="email"
            />
          </div>
        </section>

        <section className="rounded-md border border-line bg-white/[0.035] p-4">
          <label className="flex items-start gap-3 text-sm text-muted">
            <input
              type="checkbox"
              name="sendInvite"
              value="yes"
              className="mt-1"
            />
            <span>
              <span className="block font-semibold text-foreground">
                Send owner invitation now
              </span>
              The primary contact will receive a one-time activation link. If
              delivery does not confirm, the fallback link will be shown once.
            </span>
          </label>
        </section>

        <label className="block text-sm text-muted">
          Audit reason
          <textarea
            name="reason"
            required
            minLength={8}
            placeholder="Example: Adding existing paying client for portal rollout."
            className="mt-2 min-h-24 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
          />
        </label>

        <button className="rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950">
          Create client
        </button>
      </form>
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm text-muted">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        className="mt-2 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
      />
    </label>
  );
}

function Select<T extends string>({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: T;
  options: Array<{ value: T; label: string; description: string }>;
}) {
  return (
    <label className="text-sm text-muted">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="mt-1 block text-xs leading-5 text-muted">
        {options.map((option) => option.label).join(" / ")}
      </span>
    </label>
  );
}

function Textarea({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm text-muted">
      {label}
      <textarea
        name={name}
        placeholder={placeholder}
        className="mt-2 min-h-28 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
      />
    </label>
  );
}
