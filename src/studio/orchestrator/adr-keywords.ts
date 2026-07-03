/** Keyword → ADR slug map from @architecture-memory */
export const ADR_KEYWORD_MAP: Record<string, string> = {
  guidebook: "ADR-0001-guidebook-block-model",
  trail_stop: "ADR-0001-guidebook-block-model",
  workshop: "ADR-0001-guidebook-block-model",
  cheat_sheet: "ADR-0001-guidebook-block-model",
  popup: "ADR-0002-widget-plugin-api",
  gallery: "ADR-0002-widget-plugin-api",
  widget: "ADR-0002-widget-plugin-api",
  epub: "ADR-0003-epub-export-pipeline",
  export: "ADR-0003-epub-export-pipeline",
  kbp: "ADR-0003-epub-export-pipeline",
  agent: "ADR-0004-agent-handoff-contract",
  handoff: "ADR-0004-agent-handoff-contract",
  router: "ADR-0004-agent-handoff-contract",
  workflow: "ADR-0004-agent-handoff-contract",
};

export const AFFECTED_AREA_ADRS: Record<string, string[]> = {
  guidebook: [
    "ADR-0001-guidebook-block-model",
    "ADR-0003-epub-export-pipeline",
  ],
  export: ["ADR-0003-epub-export-pipeline"],
  epub: ["ADR-0003-epub-export-pipeline"],
  widget: [
    "ADR-0002-widget-plugin-api",
    "ADR-0003-epub-export-pipeline",
  ],
  editor: [
    "ADR-0001-guidebook-block-model",
    "ADR-0002-widget-plugin-api",
  ],
};
