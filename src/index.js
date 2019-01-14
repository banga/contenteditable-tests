import "./styles.css";

const bowser = require("bowser");
const browser = bowser.getParser(window.navigator.userAgent).getBrowser();

document.getElementById("app").innerHTML = `
<h1>Contenteditable Behavior</h1>
<p>A harness for testing <code>contenteditable</code> behavior on different browsers.</p>
<p>Browser: <code>${browser.name} ${browser.version}</code></p>
<div id="cases"></div>
`;

const htmlEncode = s =>
  s.replace(/[\u00A0-\u9999<>\&]/gim, c => "&#" + c.charCodeAt(0) + ";");

const makeRange = (
  startNode,
  startOffset,
  endNode = startNode,
  endOffset = startOffset
) => {
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
};

const moveCaret = (startNode, startOffset, endNode, endOffset) => {
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(makeRange(startNode, startOffset, endNode, endOffset));
};

const printNode = node => {
  if (node.nodeType === Node.TEXT_NODE) {
    return `"${node.textContent}"`;
  }
  const parts = [
    node.tagName,
    ...Array.from(node.attributes).map(attr => `${attr.name}=${attr.value}`)
  ];
  return `&lt;${parts.join(" ")}&gt;`;
};

const printRange = range =>
  `Start: ${printNode(range.startContainer)}:${range.startOffset}<br/>` +
  `End: ${printNode(range.endContainer)}:${range.endOffset}<br/>`;

const printRangeBounds = range => {
  const { left, right, top, bottom } = range.getBoundingClientRect();
  return [
    `Left: ${left}`,
    `Right: ${right}`,
    `Top: ${top}`,
    `Bottom: ${bottom}`
  ].join("<br/>");
};

const casesNode = document.getElementById("cases");

let numCases = 0;
const createTestCase = (
  title,
  tests,
  content,
  actions = [],
  callback = undefined,
  logRangeBounds = false
) => {
  numCases++;
  const node = document.createElement("section");
  node.classList.add("case");
  node.innerHTML =
    `<h2>Case ${numCases}: ${title}</h2>` +
    `<ol class='tests'></ol>` +
    `<div class='editor-columns'>` +
    `<div class='column'><div class='editor' contenteditable='true'>${content}</div></div>` +
    `<div class='column'><div class='log'></div></div>` +
    `</div>` +
    `<div class='toolbar'></div>`;
  casesNode.appendChild(node);

  const testsNode = node.querySelector(".tests");
  const editorNode = node.querySelector(".editor");
  const toolbarNode = node.querySelector(".toolbar");
  const logNode = node.querySelector(".log");

  tests.forEach(test => {
    let testText = test;
    actions.forEach(({ title }, idx) => {
      testText = testText.replace(
        "$ACTION_" + (idx + 1),
        `<code>${htmlEncode(title)}</code>`
      );
    });
    testsNode.innerHTML += `<li>${testText}</li>`;
  });

  actions.forEach(({ title, callback }) => {
    const buttonNode = document.createElement("input");
    buttonNode.setAttribute("type", "button");
    buttonNode.value = title;
    toolbarNode.appendChild(buttonNode);
    buttonNode.addEventListener("mousedown", e => {
      editorNode.focus();
      callback(editorNode);
      e.preventDefault();
    });
  });

  document.addEventListener("selectionchange", e => {
    logNode.innerHTML = "(No selection)";
    if (document.activeElement !== editorNode) {
      return;
    }
    const selection = window.getSelection();
    if (!selection.rangeCount) {
      return;
    }
    const ranges = [];
    for (let i = 0; i < selection.rangeCount; i++) {
      const range = selection.getRangeAt(i);
      ranges.push(range);
    }
    logNode.innerHTML = ranges.map(printRange).join("");

    console.log(logRangeBounds);
    if (logRangeBounds) {
      logNode.innerHTML += "<br/>";
      logNode.innerHTML += ranges.map(printRangeBounds).join("");
    }
  });

  if (callback) {
    callback(editorNode);
  }
};

createTestCase(
  "Multi-byte characters",
  [
    "Click $ACTION_1 to move the caret in the middle of this 2 byte character.",
    "When at offset 1, type to see where the character is inserted."
  ],
  "🌹",
  [
    {
      title: `Move to offset 1`,
      callback: editorNode => {
        moveCaret(editorNode.firstChild, 1);
      }
    }
  ]
);

createTestCase(
  "Caret movement in wrapper nodes",
  [
    "Click $ACTION_1. Hit <code>→</code>. Then type <code>x</code>.",
    "Click $ACTION_2. Hit <code>←</code>. Then type <code>x</code>.",
    "Click $ACTION_2. Hit <code>→</code>. Then type <code>x</code>.",
    "Click $ACTION_3. Hit <code>←</code>. Then type <code>x</code>."
  ],
  "A<b>BC</b>D",
  [
    {
      title: `Move before A`,
      callback: editorNode => {
        moveCaret(editorNode.firstChild, 0);
      }
    },
    {
      title: `Move between B and C`,
      callback: editorNode => {
        moveCaret(editorNode.childNodes[1].firstChild, 1);
      }
    },
    {
      title: `Move after D`,
      callback: editorNode => {
        moveCaret(editorNode.lastChild, 1);
      }
    }
  ]
);

createTestCase(
  "Line wrapping",
  [
    "Click $ACTION_1 to move the caret to the end of the first line. Note whether the caret ends up on the first or the second line"
  ],
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  [
    {
      title: `Move after L`,
      callback: editorNode => {
        moveCaret(editorNode.firstChild, 12);
      }
    }
  ],
  editorNode => {
    editorNode.setAttribute("style", "width: 100px; word-wrap: break-word");
  }
);

createTestCase(
  "Using <code>Range</code> with non-text nodes",
  [
    "Click $ACTION_1, $ACTION_2, $ACTION_3 or $ACTION_4 to move the caret using the editor div."
  ],
  "A<control contenteditable='false'>Control</control>B",
  [0, 1, 2, 3].map(offset => ({
    title: `Move to offset ${offset}`,
    callback: editorNode => {
      moveCaret(editorNode, offset);
    }
  }))
);

createTestCase(
  `Positioning around <code>${htmlEncode("<br>")}</code> tags`,
  [
    "Click $ACTION_1 to move before the first <code>BR</code> tag",
    "Click $ACTION_2 to move between two <code>BR</code> tags",
    "Click $ACTION_3 to move after the second <code>BR</code> tag"
  ],
  "A<br/><br/>B",
  [1, 2, 3].map(offset => ({
    title: `Move to offset ${offset}`,
    callback: editorNode => {
      moveCaret(editorNode, offset);
    }
  }))
);

createTestCase(
  "Positioning around formatting tags",
  [
    "Click $ACTION_1. Then type <code>x</code>",
    "Click $ACTION_2. Then type <code>x</code>",
    "Click $ACTION_3. Then type <code>x</code>"
  ],
  "<b><i>A</i></b>",
  [
    {
      title: `Move before <b>`,
      callback: editorNode => {
        moveCaret(editorNode, 0);
      }
    },
    {
      title: `Move after <b> but before <i>`,
      callback: editorNode => {
        moveCaret(editorNode.querySelector("b"), 0);
      }
    },
    {
      title: `Move after <i>`,
      callback: editorNode => {
        moveCaret(editorNode.querySelector("i"), 0);
      }
    }
  ]
);

createTestCase(
  "Positioning around link tags",
  [
    "Click $ACTION_1. Then type <code>x</code>",
    "Click $ACTION_2. Then type <code>x</code>",
    "Click $ACTION_3. Then type <code>x</code>"
  ],
  "<a href='//example.com'>A</a>",
  [
    {
      title: `Move before <a>`,
      callback: editorNode => {
        moveCaret(editorNode, 0);
      }
    },
    {
      title: `Move after <a>`,
      callback: editorNode => {
        moveCaret(editorNode.querySelector("a"), 0);
      }
    },
    {
      title: `Move before </a>`,
      callback: editorNode => {
        const linkNode = editorNode.querySelector("a");
        moveCaret(editorNode.querySelector("a"), linkNode.childNodes.length);
      }
    },
    {
      title: `Move after </a>`,
      callback: editorNode => {
        moveCaret(editorNode, editorNode.childNodes.length);
      }
    }
  ]
);

createTestCase(
  "Adding multiple ranges to a selection",
  [
    "Click $ACTION_1 to select two non-contiguous ranges",
    "Click $ACTION_2 to select two contiguous ranges"
  ],
  "One, two, buckle my shoe.",
  [
    {
      title: `Select "One" and "two"`,
      callback: editorNode => {
        const textNode = editorNode.firstChild;
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(makeRange(textNode, 0, textNode, 3));
        selection.addRange(makeRange(textNode, 5, textNode, 8));
      }
    },
    {
      title: `Select "One" and ", two"`,
      callback: editorNode => {
        const textNode = editorNode.firstChild;
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(makeRange(textNode, 0, textNode, 3));
        selection.addRange(makeRange(textNode, 3, textNode, 8));
      }
    }
  ]
);

createTestCase(
  "Getting caret bounds",
  [
    "Click the buttons to see the returned caret bounds when the range is positioned at various places."
  ],
  "A<control contenteditable='false'>Control</control>",
  [
    {
      title: `Before "A"`,
      callback: (editorNode, log) => moveCaret(editorNode, 0)
    },
    {
      title: `Within "A"`,
      callback: (editorNode, log) => moveCaret(editorNode.firstChild, 0)
    },
    {
      title: `Before Control`,
      callback: (editorNode, log) => moveCaret(editorNode, 1)
    },
    {
      title: `After Control`,
      callback: (editorNode, log) => moveCaret(editorNode, 2)
    },
    {
      title: `Select Control`,
      callback: (editorNode, log) => moveCaret(editorNode, 1, editorNode, 2)
    }
  ],
  null,
  true // logRangeBounds
);
