import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Coins } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useInsufficientTokensModalStore } from "@/store/insufficientTokensModalStore";

const MODAL_TITLE = "Not enough tokens";

const MODAL_BODY_INTRO =
  "This action costs more tokens than you have available. Add tokens on billing to keep working.";

const LABEL_REQUIRED = "Required";

const LABEL_BALANCE = "Your balance";

const BTN_BILLING = "Go to billing";

const BTN_CLOSE = "Close";

export function InsufficientTokensModalHost() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isOpen = useInsufficientTokensModalStore((s) => s.isOpen);
  const required = useInsufficientTokensModalStore((s) => s.required);
  const balance = useInsufficientTokensModalStore((s) => s.balance);
  const close = useInsufficientTokensModalStore((s) => s.close);

  function handleBilling() {
    void queryClient.invalidateQueries({ queryKey: ["billing", "balance"] });
    close();
    navigate("/settings/billing");
  }

  return (
    <Modal
      open={isOpen}
      onClose={close}
      title={MODAL_TITLE}
      panelClassName="max-w-md"
      contentClassName="items-start"
    >
      <div className="w-full max-w-md space-y-5">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent-light">
            <Coins className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </div>
          <p className="text-sm leading-relaxed text-slate-400">{MODAL_BODY_INTRO}</p>
        </div>
        <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface/80 px-4 py-3 font-mono text-xs">
          <dt className="text-slate-500">{LABEL_REQUIRED}</dt>
          <dd className="text-right tabular-nums text-accent-light">{required}</dd>
          <dt className="text-slate-500">{LABEL_BALANCE}</dt>
          <dd className="text-right tabular-nums text-slate-300">{balance}</dd>
        </dl>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={close}>
            {BTN_CLOSE}
          </Button>
          <Button type="button" variant="primary" className="w-full sm:w-auto" onClick={handleBilling}>
            {BTN_BILLING}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
