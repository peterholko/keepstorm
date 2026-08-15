"use client";

export default function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop rules-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="rules-modal" role="dialog" aria-modal="true" aria-labelledby="rules-heading">
        <button className="modal-close" onClick={onClose} aria-label="Close how to play">×</button>
        <span className="eyebrow">HOW TO PLAY</span>
        <h2 id="rules-heading">Build units. Break the enemy Anchorhold.</h2>
        <p className="rules-lead">Buildings create units automatically. Choose what to build, where to place it, and when to improve it.</p>

        <div className="rule-steps rule-steps--depth">
          <article><i>01</i><div><b>Factions</b><span>Each faction has five unit buildings, one support building, one income building, and one tower.</span></div></article>
          <article><i>02</i><div><b>Resources</b><span>Marks buy buildings, upgrades, and items. Construction earns Timber for advanced buildings. Sigils unlock legendary unit upgrades.</span></div></article>
          <article><i>03</i><div><b>Damage and armor</b><span>Hammer, Arrow, Arc, Siege, and Pure attacks work differently against Plate, Cloth, Ward, Fortified, and Ethereal armor. Only some units can attack air.</span></div></article>
          <article><i>04</i><div><b>Upgrades</b><span>Select one of your buildings to improve its health, unit strength, ability power, income, and production speed. Legendary unit upgrades cost a Sigil.</span></div></article>
          <article><i>05</i><div><b>Support, towers, and items</b><span>Support buildings shield, heal, or disrupt. Towers defend your build area but are weak to Siege damage. Items give permanent bonuses or one-use effects.</span></div></article>
          <article><i>06</i><div><b>Rally Sync</b><span>Rally Sync releases units from every active unit building together at the slowest production rate. Pause individual buildings to control their timing.</span></div></article>
          <article><i>07</i><div><b>Reprieve</b><span>After 1:15, you can use Reprieve once per round. It removes enemies on your half and damages enemies farther away.</span></div></article>
          <article><i>08</i><div><b>Winning</b><span>Destroy the enemy Anchorhold to win the round. At the time limit, unused Reprieve, income, base health, and remaining unit strength break ties in that order.</span></div></article>
          <article><i>09</i><div><b>2v2</b><span>Four players each choose a faction and manage separate resources, build areas, buildings, items, Rally Sync, and Reprieve. Allies share one Anchorhold and one army.</span></div></article>
        </div>

        <div className="counter-ledger" aria-label="Damage types">
          <div><b>HAMMER</b><span>strong against Plate</span></div>
          <div><b>ARROW</b><span>strong against Cloth</span></div>
          <div><b>ARC</b><span>strong against Ward</span></div>
          <div><b>SIEGE</b><span>strong against Fortified</span></div>
          <div><b>PURE</b><span>deals steady damage</span></div>
        </div>

        <button className="primary-button" onClick={onClose}>Back</button>
      </section>
    </div>
  );
}
