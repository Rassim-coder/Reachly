import { AiSalesAssistant } from "@/features/ai/components/ai-sales-assistant";

export default function AiAssistantPage() {
  return (
    <div className="mx-auto flex h-[calc(100dvh-50px)] w-full max-w-[1316px] flex-col p-3 lg:p-[18px]">
      <AiSalesAssistant />
    </div>
  );
}