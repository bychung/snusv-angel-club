import SurveyContainer from '@/components/survey/SurveyContainer';

export default async function SurveyPage({
  searchParams,
}: {
  searchParams: Promise<{ fund_id?: string }>;
}) {
  const params = await searchParams;
  return <SurveyContainer fundId={params.fund_id} />;
}
