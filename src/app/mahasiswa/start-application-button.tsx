"use client";

import { useActionState } from "react";
import { createApplicationAction, type StartApplicationState } from "./actions";

const initialState: StartApplicationState = {};

export function StartApplicationButton() {
  const [state, formAction, pending] = useActionState(createApplicationAction, initialState);

  return (
    <div className="sm:text-right">
      <form action={formAction}>
        <button className="rpl-btn rpl-btn-primary" type="submit" disabled={pending}>
          <i className={`bi ${pending ? "bi-arrow-repeat" : "bi-plus-circle"}`} />
          {pending ? "Membuat pengajuan..." : "Mulai Pengajuan RPL"}
        </button>
      </form>
      {state.error && (
        <div className="mt-2 max-w-sm rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-left text-xs font-semibold leading-5 text-red-700">
          <i className="bi bi-exclamation-triangle mr-1" />
          {state.error}
        </div>
      )}
    </div>
  );
}
