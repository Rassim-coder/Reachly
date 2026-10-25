import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  CardHeader,
  DashboardPage,
  EmptyState,
  PageHeader,
} from "@/components/ui/page-shell";
import { LeadActions } from "@/features/leads/components/lead-actions";
import { StatusBadge } from "@/features/leads/components/lead-list";
import {
  displayWebsite,
  formatLeadDate,
  isHttpUrl,
} from "@/features/leads/lead-list";
import { getLeadDetails } from "@/features/leads/queries";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;
  const result = await getLeadDetails(leadId);

  if (!result.ok) {
    if (result.reason === "not_found") notFound();

    return (
      <DashboardPage>
        <PageHeader title="Lead details" />
        <Card>
          <div role="alert">
            <EmptyState
              title="Could not load this lead"
              description={result.message}
            />
          </div>
        </Card>
        <BackToLeads />
      </DashboardPage>
    );
  }

  const lead = result.lead;

  return (
    <DashboardPage>
      <PageHeader
        title={lead.businessName}
        description={lead.location ?? "No location available"}
        action={
          <Link
            href="/my-leads"
            className="text-[12px] text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            ← Back to My Leads
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader
            title="Business details"
            description="Contact the business outside Reachly, then record what happened."
            action={<StatusBadge status={lead.status} />}
          />

          <dl className="grid gap-3 text-[12px] sm:grid-cols-2">
            <div>
              <dt className="text-faint">Phone</dt>
              <dd className="mt-0.5 text-muted">
                {lead.phone ? (
                  <a className="hover:text-ink" href={`tel:${lead.phone}`}>
                    {lead.phone}
                  </a>
                ) : (
                  "Not available"
                )}
              </dd>
            </div>

            <div>
              <dt className="text-faint">Email</dt>
              <dd className="mt-0.5 text-muted">
                {lead.email ? (
                  <a className="hover:text-ink" href={`mailto:${lead.email}`}>
                    {lead.email}
                  </a>
                ) : (
                  "Not available"
                )}
              </dd>
            </div>

            <div>
              <dt className="text-faint">Website</dt>
              <dd className="mt-0.5 text-muted">
                {lead.website ? (
                  isHttpUrl(lead.website) ? (
                    <a
                      className="hover:text-ink"
                      href={lead.website}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {displayWebsite(lead.website)}
                    </a>
                  ) : (
                    displayWebsite(lead.website)
                  )
                ) : (
                  "Not available"
                )}
              </dd>
            </div>

            <div>
              <dt className="text-faint">Category</dt>
              <dd className="mt-0.5 text-muted">
                {lead.category ?? "Not available"}
              </dd>
            </div>

            <div>
              <dt className="text-faint">Location</dt>
              <dd className="mt-0.5 text-muted">
                {lead.location ?? "Not available"}
              </dd>
            </div>

            <div>
              <dt className="text-faint">Saved</dt>
              <dd className="mt-0.5 text-muted">
                {formatLeadDate(lead.createdAt) ?? "—"}
              </dd>
            </div>

            <div>
              <dt className="text-faint">Last contact</dt>
              <dd className="mt-0.5 text-muted">
                {formatLeadDate(lead.lastContactedAt) ?? "Not contacted"}
              </dd>
            </div>

            <div>
              <dt className="text-faint">Next follow-up</dt>
              <dd className="mt-0.5 text-muted">
                {formatLeadDate(lead.nextFollowUpDate) ?? "Not scheduled"}
              </dd>
            </div>
          </dl>

          <div className="mt-5 border-t border-line pt-4">
            <LeadActions leadId={lead.id} status={lead.status} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Notes"
            description={
              lead.notes.length === 0
                ? "No notes yet."
                : `${lead.notes.length} ${lead.notes.length === 1 ? "note" : "notes"}`
            }
          />

          {lead.notes.length === 0 ? (
            <p className="rounded-xl border border-line bg-field p-3 text-[12px] text-muted">
              Add a note after contacting this business so the next step is
              clear.
            </p>
          ) : (
            <ul className="space-y-3">
              {lead.notes.map((note) => (
                <li
                  key={note.id}
                  className="rounded-xl border border-line bg-field p-3"
                >
                  <p className="whitespace-pre-wrap text-[12px] text-foreground">
                    {note.body}
                  </p>
                  <p className="mt-2 text-[11px] text-faint">
                    {formatLeadDate(note.createdAt) ?? "Unknown date"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </DashboardPage>
  );
}

function BackToLeads() {
  return (
    <Link
      href="/my-leads"
      className="mt-4 inline-block w-fit text-[12px] text-muted underline-offset-4 hover:underline"
    >
      ← Back to My Leads
    </Link>
  );
}
