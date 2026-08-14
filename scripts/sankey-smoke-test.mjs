// Runtime smoke test for the TanStack sankey definition.
// Renders the scene to SVG and verifies gradients, ribbons, node bars, labels,
// and that stroke references resolve to the emitted gradient ids.
import {
  createChartScene,
  defineChart,
  link,
  rect,
  renderChartSvg,
  text,
} from "@tanstack/charts";
import { sankeyDiagram } from "@tanstack/charts/network/sankey";
import { tooltip } from "@tanstack/charts/tooltip";

const NODE_MARK_ID = "sankey-nodes";
const LINK_MARK_ID = "sankey-links";
const NODE_WIDTH = 10;

const nodes = [
  { id: "income", label: "Income", color: "var(--income)", value: 10000 },
  { id: "saved", label: "Saved", color: "var(--savings)", value: 2000 },
  { id: "expenses", label: "Expenses", color: "var(--expense)", value: 8000 },
  { id: "parent-housing", label: "Housing", color: "#123456", value: 6000 },
  { id: "parent-food", label: "Food", color: "#654321", value: 2000 },
  { id: "child-rent", label: "Rent", color: "#111111" },
  { id: "child-utils", label: "Utilities", color: "#222222" },
  { id: "child-groceries", label: "Groceries", color: "#333333" },
  { id: "child-direct-housing", label: "Housing (direct)", color: "#123456" },
  { id: "child-direct-food", label: "Food (direct)", color: "#654321" },
  { id: "category-fun", label: "Fun", color: "#444444" },
];

const links = [
  {
    id: "income->saved",
    source: "income",
    target: "saved",
    value: 2000,
    color: "var(--savings)",
  },
  {
    id: "income->expenses",
    source: "income",
    target: "expenses",
    value: 8000,
    color: "var(--expense)",
  },
  {
    id: "expenses->parent-housing",
    source: "expenses",
    target: "parent-housing",
    value: 6000,
    color: "var(--expense)",
  },
  {
    id: "expenses->parent-food",
    source: "expenses",
    target: "parent-food",
    value: 2000,
    color: "var(--expense)",
  },
  {
    id: "parent-housing->child-rent",
    source: "parent-housing",
    target: "child-rent",
    value: 4000,
    color: "#111111",
  },
  {
    id: "parent-housing->child-utils",
    source: "parent-housing",
    target: "child-utils",
    value: 1000,
    color: "#222222",
  },
  {
    id: "parent-housing->child-direct-housing",
    source: "parent-housing",
    target: "child-direct-housing",
    value: 1000,
    color: "#123456",
  },
  {
    id: "parent-food->child-groceries",
    source: "parent-food",
    target: "child-groceries",
    value: 1500,
    color: "#333333",
  },
  {
    id: "parent-food->child-direct-food",
    source: "parent-food",
    target: "child-direct-food",
    value: 500,
    color: "#654321",
  },
  {
    id: "expenses->category-fun",
    source: "expenses",
    target: "category-fun",
    value: 500,
    color: "#444444",
  },
];

const LABEL_MARGIN = 150;
const numNodes = nodes.length;
const requiredHeight = Math.max(240, numNodes * 8);
const requiredWidth = 550 + Math.max(0, (numNodes - 15) * 20);
const nodePadding = Math.max(6, 12 - Math.max(0, numNodes - 8));

const colorById = new Map(nodes.map((n) => [n.id, n.color]));
const gradients = links.map((link) => ({
  id: `link-gradient-${link.id}`,
  x1: 0,
  y1: 0,
  x2: 1,
  y2: 0,
  stops: [
    { offset: 0, color: colorById.get(link.source) ?? link.color },
    { offset: 1, color: link.color },
  ],
}));

const definition = defineChart({
  guides: false,
  focusRing: false,
  margin: { left: LABEL_MARGIN, right: LABEL_MARGIN, top: 12, bottom: 12 },
  color: { domain: nodes.map((n) => n.id), range: nodes.map((n) => n.color) },
  gradients,
  marks: [
    sankeyDiagram({
      nodes,
      links,
      nodeKey: "id",
      source: "source",
      target: "target",
      value: "value",
      linkKey: "id",
      align: "left",
      nodeWidth: NODE_WIDTH,
      nodePadding,
      nodeSort: null,
      inset: 10,
      marks: ({ nodes: layoutNodes, links: layoutLinks }) => [
        link(layoutLinks, {
          id: LINK_MARK_ID,
          x1: "x1",
          y1: "y1",
          x2: "x2",
          y2: "y2",
          key: "key",
          stroke: (flow) => `url(#link-gradient-${flow.key})`,
          strokeWidth: (flow) => Math.max(1, flow.width),
          strokeOpacity: 0.4,
          lineCap: "butt",
        }),
        rect(layoutNodes, {
          id: NODE_MARK_ID,
          x1: "x0",
          x2: "x1",
          y1: "y0",
          y2: "y1",
          key: "key",
          color: (node) => node.key,
          radius: 2,
          states: [
            {
              when: { focus: "primary" },
              style: { stroke: "#000", strokeWidth: 2 },
            },
            { when: { focus: "unmatched" }, style: { opacity: 0.3 } },
          ],
        }),
        text(layoutNodes, {
          id: "sankey-labels",
          x: (node) => node.x,
          y: (node) => node.y,
          text: (node) => node.data.label,
          key: (node) => `${node.key}:label`,
          anchor: (node) => (node.x < requiredWidth / 2 ? "start" : "end"),
          dx: (node) =>
            node.x < requiredWidth / 2
              ? NODE_WIDTH / 2 + 6
              : -(NODE_WIDTH / 2 + 6),
          fill: "var(--foreground)",
          fontSize: 10,
          fontWeight: 500,
        }),
        text(layoutNodes, {
          id: "sankey-amounts",
          x: (node) => node.x,
          y: (node) => node.y + 8,
          text: (node) => String(node.value),
          key: (node) => `${node.key}:amount`,
          anchor: (node) => (node.x < requiredWidth / 2 ? "start" : "end"),
          dx: (node) =>
            node.x < requiredWidth / 2
              ? NODE_WIDTH / 2 + 6
              : -(NODE_WIDTH / 2 + 6),
          fill: "var(--muted-foreground)",
          fontSize: 10,
        }),
      ],
    }),
  ],
  tooltip: { use: tooltip },
});

const width = requiredWidth + LABEL_MARGIN * 2;
const height = requiredHeight + 24;
const scene = createChartScene(definition, { width, height });
const svg = renderChartSvg(scene, {
  ariaLabel: "Income and expense flow diagram",
  idPrefix: "ts-chart-test",
});

const failures = [];
const count = (re, label) => {
  const n = (svg.match(re) ?? []).length;
  if (n === 0) failures.push(`missing ${label}`);
  console.log(`${label}: ${n}`);
  return n;
};

count(/<linearGradient/g, "gradients");
count(/<line /g, "ribbon lines");
count(/<rect /g, "rects (background + node bars)");
count(/<text /g, "text labels");

// every ribbon stroke must reference a defined gradient
const strokeRefs = [...svg.matchAll(/stroke="url\(#([^)]+)\)"/g)].map(
  (m) => m[1],
);
const gradientIds = [...svg.matchAll(/<linearGradient[^>]* id="([^"]+)"/g)].map(
  (m) => m[1],
);
const missing = strokeRefs.filter((id) => !gradientIds.includes(id));
console.log(
  `stroke refs: ${strokeRefs.length}, gradient defs: ${gradientIds.length}, missing: ${missing.length}`,
);
if (missing.length) failures.push(`unresolved stroke refs: ${missing}`);

// node bars must be painted with the resolved per-node colors (CSS vars passed through)
const hasVarFill = /fill="var\(--(income|savings|expense)\)"/.test(svg);
if (!hasVarFill) failures.push("no var() fill on node bars");
console.log("var() fills on node bars:", hasVarFill);

// layout sanity: ribbons span between node columns
const lines = [...svg.matchAll(/<line [^>]*>/g)];
const spansAcross = lines.filter((lineTag) => {
  const attrs = {};
  for (const m of lineTag[0].matchAll(/([a-z0-9-]+)="([^"]*)"/g)) {
    attrs[m[1]] = Number(m[2]);
  }
  return attrs.y2 !== attrs.y1 || attrs.x2 !== attrs.x1;
});
console.log("ribbons with vertical span (flow ribbons):", spansAcross.length);
if (spansAcross.length === 0)
  failures.push("ribbons are degenerate (no vertical span)");

if (failures.length) {
  console.error(`FAILURES:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("OK: runtime smoke test passed");
