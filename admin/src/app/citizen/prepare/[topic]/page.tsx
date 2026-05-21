import type { ReactElement } from "react";
import { PrepareGuidePage } from "@/components/citizen/prepare-guide-page";
import { PREPARE_TOPIC_IDS } from "@/lib/preparedness-guides";

export function generateStaticParams(): Array<{ topic: string }> {
  return PREPARE_TOPIC_IDS.map((topic) => ({ topic }));
}

export default function CitizenPrepareTopicPage(props: {
  params: Promise<{ topic: string }>;
}): ReactElement {
  return <PrepareGuidePage params={props.params} />;
}
