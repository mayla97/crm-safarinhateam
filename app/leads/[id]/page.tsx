import { LeadDetailForm } from "@/components/leads/LeadDetailForm";

export default function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <LeadDetailForm id={params.id} />;
}
