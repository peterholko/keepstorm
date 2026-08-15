export default function StartSteps({ current, online }: { current: 1 | 2 | 3; online: boolean }) {
  const steps = online ? ["Mode", "Faction", "Lobby"] : ["Mode", "Faction"];

  return (
    <ol className="start-steps" aria-label="Game setup progress">
      {steps.map((label, index) => {
        const number = (index + 1) as 1 | 2 | 3;
        const state = number === current ? "is-current" : number < current ? "is-complete" : "";
        return (
          <li key={label} className={state} aria-current={number === current ? "step" : undefined}>
            <i>{number}</i>
            <span>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
