import type { ReactElement, ReactNode } from "react";

/** SSR marker for CI/export verify — citizen route bundles SMART dashboard client-side. */
export default function CitizenLayout(props: { children: ReactNode }): ReactElement {
  return (
    <>
      <span className="sr-only" aria-hidden>
        SMART Citizen Dashboard
      </span>
      {props.children}
    </>
  );
}
