<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep prototype compliance rules, holiday records and immutable audit versions in ComplianceProvider alongside existing session-scoped providers; no production compliance service is implied.
- Evaluate all inherited mandatory compliance restrictions together with System and Client operational rules before simulated communication execution; client settings may add restrictions but never override mandatory protections.
- Calculate contact windows from recipient IANA time zones using Intl and real UTC instants so daylight saving transitions preserve local-time restrictions.
- Reuse client rule selectors in onboarding, configuration, Rules and simulated import; keep operational selections in ClientConfig and never clone another client's configuration for a new import.
- Introduce reusable operational catalogue additions as unassigned drafts in rules-data; explicit activation and client selection prevent silently changing existing client execution.
