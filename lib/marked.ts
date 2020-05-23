/**
 * marked - a markdown parser
 * Copyright (c) 2011-2018, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/markedjs/marked
 */

// Definitions adapted from
// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/marked/index.d.ts
// Original Definitions by: William Orr <https://github.com/worr>
//                 BendingBender <https://github.com/BendingBender>
//                 CrossR <https://github.com/CrossR>
//                 Mike Wickett <https://github.com/mwickett>

"use strict";

interface MarkedOptions {
  /**
   * A prefix URL for any relative link.
   */
  baseUrl?: string;

  /**
   * Enable GFM line breaks. This option requires the gfm option to be true.
   */
  breaks?: boolean;

  /**
   * Enable GitHub flavored markdown.
   */
  gfm?: boolean;

  /**
   * Include an id attribute when emitting headings.
   */
  headerIds?: boolean;

  /**
   * Set the prefix for header tag ids.
   */
  headerPrefix?: string;

  /**
   * A function to highlight code blocks. The function takes three arguments: code, lang, and callback.
   */
  highlight?(code: string, lang: string, callback?: (error: any | undefined, code: string) => void): string;

  /**
   * Set the prefix for code block classes.
   */
  langPrefix?: string;

  /**
   * Mangle autolinks (<email@domain.com>).
   */
  mangle?: boolean;

  /**
   * Conform to obscure parts of markdown.pl as much as possible. Don't fix any of the original markdown bugs or poor behavior.
   */
  pedantic?: boolean;

  /**
   * Type: object Default: new Renderer()
   *
   * An object containing functions to render tokens to HTML.
   */
  renderer?: Renderer;

  /**
   * Sanitize the output. Ignore any HTML that has been input.
   */
  sanitize?: boolean;

  /**
   * Optionally sanitize found HTML with a sanitizer function.
   */
  sanitizer?(html: string): string;

  /**
   * Shows an HTML error message when rendering fails.
   */
  silent?: boolean;

  /**
   * Use smarter list behavior than the original markdown. May eventually be default with the old behavior moved into pedantic.
   */
  smartLists?: boolean;

  /**
   * Use "smart" typograhic punctuation for things like quotes and dashes.
   */
  smartypants?: boolean;

  /**
   * Enable GFM tables. This option requires the gfm option to be true.
   */
  tables?: boolean;

  /**
   * Generate closing slash for self-closing tags (<br/> instead of <br>)
   */
  xhtml?: boolean;
}

interface Rules {
  [ruleName: string]: any;
}

interface Link {
  href: string;
  title: string;
}

type TokensList = [] & Token[] & {
  links: {
      [key: string]: { href: string; title: string; }
  }
};


type Token =
  Tokens.Space
  | Tokens.Code
  | Tokens.Heading
  | Tokens.Table
  | Tokens.Hr
  | Tokens.BlockquoteStart
  | Tokens.BlockquoteEnd
  | Tokens.ListStart
  | Tokens.LooseItemStart
  | Tokens.ListItemStart
  | Tokens.ListItemEnd
  | Tokens.ListEnd
  | Tokens.Paragraph
  | Tokens.HTML
  | Tokens.Text
  | Tokens.ListStart;

type AlignPosition = "center" | "left" | "right" | null

namespace Tokens {
  export interface Space {
      type: 'space';
  }

  export interface Code {
      type: 'code';
      lang?: string;
      text: string;
      escaped?: boolean;
  }

  export interface Heading {
      type: 'heading';
      depth: number;
      text: string;
  }

  export interface Table {
      type: 'table';
      header: string[];
      align: Array<AlignPosition>;
      cells: string[][];
  }

  export interface Hr {
      type: 'hr';
  }

  export interface BlockquoteStart {
      type: 'blockquote_start';
  }

  export interface BlockquoteEnd {
      type: 'blockquote_end';
  }

  export interface ListStart {
      type: 'list_start';
      ordered: boolean;
  }

  export interface LooseItemStart {
      type: 'loose_item_start';
  }

  export interface ListItemStart {
      type: 'list_item_start';
  }

  export interface ListItemEnd {
      type: 'list_item_end';
  }

  export interface ListEnd {
      type: 'list_end';
  }

  export interface Paragraph {
      type: 'paragraph';
      pre?: boolean;
      text: string;
  }

  export interface HTML {
      type: 'html';
      pre: boolean;
      text: string;
  }

  export interface Text {
      type: 'text';
      text: string;
  }
}

/**
 * Block-Level Grammar
 */

const block: Rules = {
  newline: /^\n+/,
  code: /^( {4}[^\n]+\n*)+/,
  fences: noop,
  hr: /^ {0,3}((?:- *){3,}|(?:_ *){3,}|(?:\* *){3,})(?:\n+|$)/,
  heading: /^ *(#{1,6}) *([^\n]+?) *(?:#+ *)?(?:\n+|$)/,
  nptable: noop,
  blockquote: /^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/,
  list: /^( {0,3})(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
  html: '^ {0,3}(?:' // optional indentation
    + '<(script|pre|style)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)' // (1)
    + '|comment[^\\n]*(\\n+|$)' // (2)
    + '|<\\?[\\s\\S]*?\\?>\\n*' // (3)
    + '|<![A-Z][\\s\\S]*?>\\n*' // (4)
    + '|<!\\[CDATA\\[[\\s\\S]*?\\]\\]>\\n*' // (5)
    + '|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:\\n{2,}|$)' // (6)
    + '|<(?!script|pre|style)([a-z][\\w-]*)(?:attribute)*? */?>(?=\\h*\\n)[\\s\\S]*?(?:\\n{2,}|$)' // (7) open tag
    + '|</(?!script|pre|style)[a-z][\\w-]*\\s*>(?=\\h*\\n)[\\s\\S]*?(?:\\n{2,}|$)' // (7) closing tag
    + ')',
  def: /^ {0,3}\[(label)\]: *\n? *<?([^\s>]+)>?(?:(?: +\n? *| *\n *)(title))? *(?:\n+|$)/,
  table: noop,
  lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
  paragraph: /^([^\n]+(?:\n(?!hr|heading|lheading| {0,3}>|<\/?(?:tag)(?: +|\n|\/?>)|<(?:script|pre|style|!--))[^\n]+)*)/,
  text: /^[^\n]+/,
};

block._label = /(?!\s*\])(?:\\[\[\]]|[^\[\]])+/;
block._title = /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/;
block.def = edit(block.def)
  .replace('label', block._label)
  .replace('title', block._title)
  .getRegex();

block.bullet = /(?:[*+-]|\d{1,9}\.)/;
block.item = /^( *)(bull) ?[^\n]*(?:\n(?!\1bull ?)[^\n]*)*/;
block.item = edit(block.item, 'gm')
  .replace(/bull/g, block.bullet)
  .getRegex();

block.list = edit(block.list)
  .replace(/bull/g, block.bullet)
  .replace('hr', '\\n+(?=\\1?(?:(?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$))')
  .replace('def', `\\n+(?=${block.def.source})`)
  .getRegex();

block._tag = 'address|article|aside|base|basefont|blockquote|body|caption'
  + '|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption'
  + '|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe'
  + '|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option'
  + '|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr'
  + '|track|ul';
block._comment = /<!--(?!-?>)[\s\S]*?-->/;
block.html = edit(block.html, 'i')
  .replace('comment', block._comment)
  .replace('tag', block._tag)
  .replace('attribute', / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/)
  .getRegex();

block.paragraph = edit(block.paragraph)
  .replace('hr', block.hr)
  .replace('heading', block.heading)
  .replace('lheading', block.lheading)
  .replace('tag', block._tag) // pars can be interrupted by type (6) html blocks
  .getRegex();

block.blockquote = edit(block.blockquote)
  .replace('paragraph', block.paragraph)
  .getRegex();

/**
 * Normal Block Grammar
 */

block.normal = merge({}, block);

/**
 * GFM Block Grammar
 */

block.gfm = merge({}, block.normal, {
  fences: /^ {0,3}(`{3,}|~{3,})([^`\n]*)\n(?:|([\s\S]*?)\n)(?: {0,3}\1[~`]* *(?:\n+|$)|$)/,
  paragraph: /^/,
  heading: /^ *(#{1,6}) +([^\n]+?) *#* *(?:\n+|$)/
});

block.gfm.paragraph = edit(block.paragraph)
  .replace('(?!', `(?!${block.gfm.fences.source.replace('\\1', '\\2')}|${block.list.source.replace('\\1', '\\3')}|`)
  .getRegex();

/**
 * GFM + Tables Block Grammar
 */

block.tables = merge({}, block.gfm, {
  nptable: /^ *([^|\n ].*\|.*)\n *([-:]+ *\|[-| :]*)(?:\n((?:.*[^>\n ].*(?:\n|$))*)\n*|$)/,
  table: /^ *\|(.+)\n *\|?( *[-:]+[-| :]*)(?:\n((?: *[^>\n ].*(?:\n|$))*)\n*|$)/
});

/**
 * Pedantic grammar
 */

block.pedantic = merge({}, block.normal, {
  html: edit(
    '^ *(?:comment *(?:\\n|\\s*$)'
    + '|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)' // closed tag
    + '|<tag(?:"[^"]*"|\'[^\']*\'|\\s[^\'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))')
    .replace('comment', block._comment)
    .replace(/tag/g, '(?!(?:'
      + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub'
      + '|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)'
      + '\\b)\\w+(?!:|[^\\w\\s@]*@)\\b')
    .getRegex(),
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/
});

/**
 * Block Lexer
 */

class Lexer {
  /**
   * Expose Block Rules
   */
  static rules = block;
  /**
   * Static Lex Method
   */
  static lex(src: string, options?: MarkedOptions): TokensList {
    const lexer = new Lexer(options);
    return lexer.lex(src);
  };

  tokens: TokensList;
  options: MarkedOptions;
  rules: Rules;
  constructor(options?: MarkedOptions) {
    this.tokens = [] as TokensList;
    this.tokens.links = Object.create(null);
    

    this.options = options || (marked.defaults as unknown as MarkedOptions);
    this.rules = block.normal;

    if (this.options.pedantic) {
      this.rules = block.pedantic;
    } else if (this.options?.gfm) {
      if (this.options.tables) {
        this.rules = block.tables;
      } else {
        this.rules = block.gfm;
      }
    }
  }

  /**
   * Preprocessing
   */

  lex(src: string) {
    src = src
      .replace(/\r\n|\r/g, '\n')
      .replace(/\t/g, '    ')
      .replace(/\u00a0/g, ' ')
      .replace(/\u2424/g, '\n');

    return this.token(src, true);
  }

  /**
   * Lexing
   */

  token(src: string, top: boolean) {
    src = src.replace(/^ +$/gm, '');
    let next;
    let loose;
    let cap;
    let bull;
    let b;
    let item;
    let listStart;
    let listItems;
    let t;
    let space;
    let i;
    let tag;
    let l;
    let isordered;
    let istask;
    let ischecked;

    while (src) {
      // newline
      if (cap = this.rules.newline.exec(src)) {
        src = src.substring(cap[0].length);
        if (cap[0].length > 1) {
          this.tokens.push({
            type: 'space'
          });
        }
      }

      // code
      if (cap = this.rules.code.exec(src)) {
        src = src.substring(cap[0].length);
        cap = cap[0].replace(/^ {4}/gm, '');
        this.tokens.push({
          type: 'code',
          text: !this.options.pedantic 
            ? rtrim(cap, '\n')
            : cap 
        });
        continue;
      }

      // fences (gfm)
      if (cap = this.rules.fences.exec(src)) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: 'code',
          lang: cap[2] ? cap[2].trim() : cap[2],
          text: cap[3] || ''
        });
        continue;
      }

      // heading
      if (cap = this.rules.heading.exec(src)) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: 'heading',
          depth: cap[1].length,
          text: cap[2]
        });
        continue;
      }

      // table no leading pipe (gfm)
      if (top && (cap = this.rules.nptable.exec(src))) {
        item = {
          type: 'table' as 'table',
          header: splitCells(cap[1].replace(/^ *| *\| *$/g, '')),
          align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
          cells: cap[3] ? cap[3].replace(/\n$/, '').split('\n') : []
        } as Tokens.Table;

        if (item.header.length === item.align.length) {
          src = src.substring(cap[0].length);

          for (i = 0; i < item.align.length; i++) {
            if (/^ *-+: *$/.test(item.align[i] as string)) {
              item.align[i] = 'right';
            } else if (/^ *:-+: *$/.test(item.align[i] as string)) {
              item.align[i] = 'center';
            } else if (/^ *:-+ *$/.test(item.align[i] as string)) {
              item.align[i] = 'left';
            } else {
              item.align[i] = null;
            }
          }

          for (i = 0; i < item.cells.length; i++) { 
            item.cells[i] = splitCells(item.cells[i].toString(), item.header.length);
          }

          this.tokens.push(item);

          continue;
        }
      }

      // hr
      if (cap = this.rules.hr.exec(src)) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: 'hr'
        });
        continue;
      }

      // blockquote
      if (cap = this.rules.blockquote.exec(src)) {
        src = src.substring(cap[0].length);

        this.tokens.push({
          type: 'blockquote_start'
        });

        cap = cap[0].replace(/^ *> ?/gm, '');

        // Pass `top` to keep the current
        // "toplevel" state. This is exactly
        // how markdown.pl works.
        this.token(cap, top);

        this.tokens.push({
          type: 'blockquote_end'
        });

        continue;
      }

      // list
      if (cap = this.rules.list.exec(src)) {
        src = src.substring(cap[0].length);
        bull = cap[2];
        isordered = bull.length > 1;

        listStart = {
          type: 'list_start',
          ordered: isordered,
          start: isordered ? +bull : '',
          loose: false
        };


        this.tokens.push(listStart as Tokens.ListStart);

        // Get each top-level item.
        cap = cap[0].match(this.rules.item);

        listItems = [];
        next = false;
        l = cap.length;
        i = 0;

        for (; i < l; i++) {
          item = cap[i];

          // Remove the list item's bullet
          // so it is seen as the next token.

          space = item.length;
          item = item.replace(/^ *([*+-]|\d+\.) */, '');

          // Outdent whatever the
          // list item contains. Hacky.
          if (~item.indexOf('\n ')) {
            space -= item.length;
            item = !this.options.pedantic
              ? item.replace(new RegExp(`^ {1,${space}}`, 'gm'), '')
              : item.replace(/^ {1,4}/gm, '');
          }

          // Determine whether the next list item belongs here.
          // Backpedal if it does not belong in this list.
          if (i !== l - 1) {
            b = block.bullet.exec(cap[i + 1])[0];
            if (bull.length > 1 ? b.length === 1
              : (b.length > 1 || (this.options.smartLists && b !== bull))) {
              src = cap.slice(i + 1).join('\n') + src;
              i = l - 1;
            }
          }

          // Determine whether item is loose or not.
          // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
          // for discount behavior.
          loose = next || /\n\n(?!\s*$)/.test(item);
          if (i !== l - 1) {
            next = item.charAt(item.length - 1) === '\n';
            if (!loose) loose = next;
          }

          if (loose) {
            listStart.loose = true;
          }

          // Check for task list items
          istask = /^\[[ xX]\] /.test(item);
          ischecked = undefined;
          if (istask) {
            ischecked = item[1] !== ' ';
            item = item.replace(/^\[[ xX]\] +/, '');
          }

          t = {
            type: 'list_item_start',
            task: istask,
            checked: ischecked,
            loose
          } as unknown as Tokens.ListStart;
          

          listItems.push(t);
          this.tokens.push(t);

          // Recurse.
          this.token(item, false);

          this.tokens.push({
            type: 'list_item_end'
          });
        }

        if (listStart.loose) {
          l = listItems.length;
          i = 0;
          for (; i < l; i++) {
            (listItems[i] as any).loose = true;
          }
        }

        this.tokens.push({
          type: 'list_end'
        });

        continue;
      }

      // html
      if (cap = this.rules.html.exec(src)) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: this.options?.sanitize
            ? 'paragraph'
            : 'html',
          pre: !this.options?.sanitizer
            && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
          text: cap[0]
        } as Token);
        continue;
      }

      // def
      if (top && (cap = this.rules.def.exec(src))) {
        src = src.substring(cap[0].length);
        if (cap[3]) cap[3] = cap[3].substring(1, cap[3].length - 1);
        tag = cap[1].toLowerCase().replace(/\s+/g, ' ');
        if (!this.tokens.links[tag]) {
          this.tokens.links[tag] = {
            href: cap[2],
            title: cap[3]
          };
        }
        continue;
      }

      // table (gfm)
      if (top && (cap = this.rules.table.exec(src))) {
        item = {
          type: 'table' as 'table',
          header: splitCells(cap[1].replace(/^ *| *\| *$/g, '')),
          align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
          cells: cap[3] ? cap[3].replace(/(?: *\| *)?\n$/, '').split('\n') : []
        };

        if (item.header.length === item.align.length) {
          src = src.substring(cap[0].length);

          for (i = 0; i < item.align.length; i++) {
            if (/^ *-+: *$/.test(item.align[i])) {
              item.align[i] = 'right';
            } else if (/^ *:-+: *$/.test(item.align[i])) {
              item.align[i] = 'center';
            } else if (/^ *:-+ *$/.test(item.align[i])) {
              item.align[i] = 'left';
            } else {
              item.align[i] = null;
            }
          }

          for (i = 0; i < item.cells.length; i++) {
            item.cells[i] = splitCells(
              item.cells[i].replace(/^ *\| *| *\| *$/g, ''),
              item.header.length);
          }

          this.tokens.push(item);

          continue;
        }
      }

      // lheading
      if (cap = this.rules.lheading.exec(src)) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: 'heading',
          depth: cap[2] === '=' ? 1 : 2,
          text: cap[1]
        });
        continue;
      }

      // top-level paragraph
      if (top && (cap = this.rules.paragraph.exec(src))) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: 'paragraph',
          text: cap[1].charAt(cap[1].length - 1) === '\n'
            ? cap[1].slice(0, -1)
            : cap[1]
        });
        continue;
      }

      // text
      if (cap = this.rules.text.exec(src)) {
        // Top-level should never reach here.
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: 'text',
          text: cap[0]
        });
        continue;
      }

      if (src) {
        throw new Error(`Infinite loop on byte: ${src.charCodeAt(0)}`);
      }
    }

    return this.tokens;
  }
}

/**
 * Inline-Level Grammar
 */

const inline: Rules = {
  escape: /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,
  autolink: /^<(scheme:[^\s\x00-\x1f<>]*|email)>/,
  url: noop,
  tag: '^comment'
    + '|^</[a-zA-Z][\\w:-]*\\s*>' // self-closing tag
    + '|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>' // open tag
    + '|^<\\?[\\s\\S]*?\\?>' // processing instruction, e.g. <?php ?>
    + '|^<![a-zA-Z]+\\s[\\s\\S]*?>' // declaration, e.g. <!DOCTYPE html>
    + '|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>', // CDATA section
  link: /^!?\[(label)\]\(href(?:\s+(title))?\s*\)/,
  reflink: /^!?\[(label)\]\[(?!\s*\])((?:\\[\[\]]?|[^\[\]\\])+)\]/,
  nolink: /^!?\[(?!\s*\])((?:\[[^\[\]]*\]|\\[\[\]]|[^\[\]])*)\](?:\[\])?/,
  strong: /^__([^\s_])__(?!_)|^\*\*([^\s*])\*\*(?!\*)|^__([^\s][\s\S]*?[^\s])__(?!_)|^\*\*([^\s][\s\S]*?[^\s])\*\*(?!\*)/,
  em: /^_([^\s_])_(?!_)|^\*([^\s*"<\[])\*(?!\*)|^_([^\s][\s\S]*?[^\s_])_(?!_|[^\spunctuation])|^_([^\s_][\s\S]*?[^\s])_(?!_|[^\spunctuation])|^\*([^\s"<\[][\s\S]*?[^\s*])\*(?!\*)|^\*([^\s*"<\[][\s\S]*?[^\s])\*(?!\*)/,
  code: /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,
  br: /^( {2,}|\\)\n(?!\s*$)/,
  del: noop,
  text: /^(`+|[^`])[\s\S]*?(?=[\\<!\[`*]|\b_| {2,}\n|$)/
};

// list of punctuation marks from common mark spec
// without ` and ] to workaround Rule 17 (inline code blocks/links)
inline._punctuation = '!"#$%&\'()*+,\\-./:;<=>?@\\[^_{|}~';
inline.em = edit(inline.em).replace(/punctuation/g, inline._punctuation).getRegex();

inline._escapes = /\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/g;

inline._scheme = /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/;
inline._email = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/;
inline.autolink = edit(inline.autolink)
  .replace('scheme', inline._scheme)
  .replace('email', inline._email)
  .getRegex();

inline._attribute = /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/;

inline.tag = edit(inline.tag)
  .replace('comment', block._comment)
  .replace('attribute', inline._attribute)
  .getRegex();

inline._label = /(?:\[[^\[\]]*\]|\\[\[\]]?|`[^`]*`|[^\[\]\\])*?/;
inline._href = /\s*(<(?:\\[<>]?|[^\s<>\\])*>|(?:\\[()]?|\([^\s\x00-\x1f\\]*\)|[^\s\x00-\x1f()\\])*?)/;
inline._title = /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/;

inline.link = edit(inline.link)
  .replace('label', inline._label)
  .replace('href', inline._href)
  .replace('title', inline._title)
  .getRegex();

inline.reflink = edit(inline.reflink)
  .replace('label', inline._label)
  .getRegex();

/**
 * Normal Inline Grammar
 */

inline.normal = merge({}, inline);

/**
 * Pedantic Inline Grammar
 */

inline.pedantic = merge({}, inline.normal, {
  strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
  em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/,
  link: edit(/^!?\[(label)\]\((.*?)\)/)
    .replace('label', inline._label)
    .getRegex(),
  reflink: edit(/^!?\[(label)\]\s*\[([^\]]*)\]/)
    .replace('label', inline._label)
    .getRegex()
});

/**
 * GFM Inline Grammar
 */

inline.gfm = merge({}, inline.normal, {
  escape: edit(inline.escape).replace('])', '~|])').getRegex(),
  _extended_email: /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/,
  url: /^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/,
  _backpedal: /(?:[^?!.,:;*_~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_~)]+(?!$))+/,
  del: /^~+(?=\S)([\s\S]*?\S)~+/,
  text: edit(inline.text)
    .replace(']|', '~]|')
    .replace('|$', '|https?://|ftp://|www\\.|[a-zA-Z0-9.!#$%&\'*+/=?^_`{\\|}~-]+@|$')
    .getRegex()
});

inline.gfm.url = edit(inline.gfm.url, 'i')
  .replace('email', inline.gfm._extended_email)
  .getRegex();
/**
 * GFM + Line Breaks Inline Grammar
 */

inline.breaks = merge({}, inline.gfm, {
  br: edit(inline.br).replace('{2,}', '*').getRegex(),
  text: edit(inline.gfm.text).replace('{2,}', '*').getRegex()
});

/**
 * Inline Lexer & Compiler
 */

class InlineLexer {
  /**
   * Expose Inline Rules
   */

 static rules = inline;

  /**
   * Static Lexing/Compiling Method
   */

  static output(src: string, links: {[key: string]: Link}, options?: MarkedOptions) {
    const inline = new InlineLexer(links, options);
    return inline.output(src);
  };

  static escapes = 
    (text: string): string => text ? text.replace(InlineLexer.rules._escapes, '$1') : text;

  options: MarkedOptions | undefined;
  links: {[key: string]: Link};
  rules: Rules;
  renderer: any;
  inLink: any;
  inRawBlock: any;

  constructor(links: {[key: string]: Link}, options?: MarkedOptions) {
    this.options = options || (marked.defaults as unknown as MarkedOptions);
    this.links = links;
    this.rules = inline.normal;
    this.renderer = this.options?.renderer || new Renderer();
    this.renderer.options = this.options;

    if (!this.links) {
      throw new Error('Tokens array requires a `links` property.');
    }

    if (this.options?.pedantic) {
      this.rules = inline.pedantic;
    } else if (this.options?.gfm) {
      if (this.options?.breaks) {
        this.rules = inline.breaks;
      } else {
        this.rules = inline.gfm;
      }
    }
  }

  /**
   * Lexing/Compiling
   */

  output(src: string) {
    let out = '';
    let link;
    let text;
    let href;
    let title;
    let cap;
    let prevCapZero;

    while (src) {
      // escape
      if (cap = this.rules.escape.exec(src)) {
        src = src.substring(cap[0].length);
        out += escape(cap[1]);
        continue;
      }

      // tag
      if (cap = this.rules.tag.exec(src)) {
        if (!this.inLink && /^<a /i.test(cap[0])) {
          this.inLink = true;
        } else if (this.inLink && /^<\/a>/i.test(cap[0])) {
          this.inLink = false;
        }
        if (!this.inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
          this.inRawBlock = true;
        } else if (this.inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
          this.inRawBlock = false;
        }

        src = src.substring(cap[0].length);
        out += this.options?.sanitize
          ? this.options?.sanitizer
            ? this.options?.sanitizer(cap[0])
            : escape(cap[0])
          : cap[0];
        continue;
      }

      // link
      if (cap = this.rules.link.exec(src)) {
        src = src.substring(cap[0].length);
        this.inLink = true;
        href = cap[2];
        if (this.options?.pedantic) {
          link = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(href);

          if (link) {
            href = link[1];
            title = link[3];
          } else {
            title = '';
          }
        } else {
          title = cap[3] ? cap[3].slice(1, -1) : '';
        }
        href = href.trim().replace(/^<([\s\S]*)>$/, '$1');
        out += this.outputLink(cap, {
          href: InlineLexer.escapes(href),
          title: InlineLexer.escapes(title)
        });
        this.inLink = false;
        continue;
      }

      // reflink, nolink
      if ((cap = this.rules.reflink.exec(src))
          || (cap = this.rules.nolink.exec(src))) {
        src = src.substring(cap[0].length);
        link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
        link = this.links[link.toLowerCase()];
        if (!link || !link.href) {
          out += cap[0].charAt(0);
          src = cap[0].substring(1) + src;
          continue;
        }
        this.inLink = true;
        out += this.outputLink(cap, link);
        this.inLink = false;
        continue;
      }

      // strong
      if (cap = this.rules.strong.exec(src)) {
        src = src.substring(cap[0].length);
        out += this.renderer.strong(this.output(cap[4] || cap[3] || cap[2] || cap[1]));
        continue;
      }

      // em
      if (cap = this.rules.em.exec(src)) {
        src = src.substring(cap[0].length);
        out += this.renderer.em(this.output(cap[6] || cap[5] || cap[4] || cap[3] || cap[2] || cap[1]));
        continue;
      }

      // code
      if (cap = this.rules.code.exec(src)) {
        src = src.substring(cap[0].length);
        out += this.renderer.codespan(escape(cap[2].trim(), true));
        continue;
      }

      // br
      if (cap = this.rules.br.exec(src)) {
        src = src.substring(cap[0].length);
        out += this.renderer.br();
        continue;
      }

      // del (gfm)
      if (cap = this.rules.del.exec(src)) {
        src = src.substring(cap[0].length);
        out += this.renderer.del(this.output(cap[1]));
        continue;
      }

      // autolink
      if (cap = this.rules.autolink.exec(src)) {
        src = src.substring(cap[0].length);
        if (cap[2] === '@') {
          text = escape(this.mangle(cap[1]));
          href = `mailto:${text}`;
        } else {
          text = escape(cap[1]);
          href = text;
        }
        out += this.renderer.link(href, null, text);
        continue;
      }

      // url (gfm)
      if (!this.inLink && (cap = this.rules.url.exec(src))) {
        if (cap[2] === '@') {
          text = escape(cap[0]);
          href = `mailto:${text}`;
        } else {
          // do extended autolink path validation
          do {
            prevCapZero = cap[0];
            cap[0] = this.rules._backpedal.exec(cap[0])[0];
          } while (prevCapZero !== cap[0]);
          text = escape(cap[0]);
          if (cap[1] === 'www.') {
            href = `http://${text}`;
          } else {
            href = text;
          }
        }
        src = src.substring(cap[0].length);
        out += this.renderer.link(href, null, text);
        continue;
      }

      // text
      if (cap = this.rules.text.exec(src)) {
        src = src.substring(cap[0].length);
        if (this.inRawBlock) {
          out += this.renderer.text(cap[0]);
        } else {
          out += this.renderer.text(escape(this.smartypants(cap[0])));
        }
        continue;
      }

      if (src) {
        throw new Error(`Infinite loop on byte: ${src.charCodeAt(0)}`);
      }
    }

    return out;
  }

  /**
   * Compile Link
   */

  outputLink(cap: string, link: Link) {
    const href = link.href;
    const title = link.title ? escape(link.title) : null;

    return cap[0].charAt(0) !== '!'
      ? this.renderer.link(href, title, this.output(cap[1]))
      : this.renderer.image(href, title, escape(cap[1]));
  }

  /**
   * Smartypants Transformations
   */

  smartypants(text: string) {
    if (!this.options?.smartypants) return text;
    return text
      // em-dashes
      .replace(/---/g, '\u2014')
      // en-dashes
      .replace(/--/g, '\u2013')
      // opening singles
      .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
      // closing singles & apostrophes
      .replace(/'/g, '\u2019')
      // opening doubles
      .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
      // closing doubles
      .replace(/"/g, '\u201d')
      // ellipses
      .replace(/\.{3}/g, '\u2026');
  }

  /**
   * Mangle Links
   */

  mangle(text: string) {
    if (!this.options?.mangle) return text;
    let out = '';
    const l = text.length;
    let i = 0;
    let ch;

    for (; i < l; i++) {
      ch = text.charCodeAt(i);
      if (Math.random() > 0.5) {
        ch = `x${ch.toString(16)}`;
      }
      out += `&#${ch};`;
    }

    return out;
  }
}

/**
 * Renderer
 */

class Renderer {
  options: MarkedOptions;

  constructor(options?: MarkedOptions) {
    this.options = options || (marked.defaults as unknown as MarkedOptions);
  }

  code(code: string, infostring: string, escaped: boolean) {

    //@ts-ignore: may be null
    const lang = infostring.match(/\S*/)[0];

    if (this.options?.highlight) {
      const out = this.options?.highlight(code, lang);
      if (out != null && out !== code) {
        escaped = true;
        code = out;
      }
    }

    if (!lang) {
      return `<pre><code>${escaped ? code : escape(code, true)}</code></pre>`;
    }

    return `<pre><code class="${this.options?.langPrefix}${escape(lang, true)}">${escaped ? code : escape(code, true)}</code></pre>\n`;
  }

  blockquote(quote: string) {
    return `<blockquote>\n${quote}</blockquote>\n`;
  }

  html(html: string) {
    return html;
  }

  heading(text: string, level: number, raw: string, slugger: Slugger) {
    if (this.options?.headerIds) {
      return `<h${level} id="${this.options.headerPrefix}${slugger.slug(raw)}">${text}</h${level}>\n`;
    }
    // ignore IDs
    return `<h${level}>${text}</h${level}>\n`;
  }

  hr() {
    return this.options?.xhtml ? '<hr/>\n' : '<hr>\n';
  }

  list(body: string, ordered: boolean, start: number) {
    const type = ordered ? 'ol' : 'ul';
    const startatt = (ordered && start !== 1) ? (` start="${start}"`) : '';
    return `<${type}${startatt}>\n${body}</${type}>\n`;
  }

  listitem(text: string) {
    return `<li>${text}</li>\n`;
  }

  checkbox(checked: boolean) {
    return `<input ${checked ? 'checked="" ' : ''}disabled="" type="checkbox"${this.options?.xhtml ? ' /' : ''}> `;
  }

  paragraph(text: string) {
    return `<p>${text}</p>\n`;
  }

  table(header: string, body: string) {
    if (body) body = `<tbody>${body}</tbody>`;

    return `<table>\n<thead>\n${header}</thead>\n${body}</table>\n`;
  }

  tablerow(content: string) {
    return `<tr>\n${content}</tr>\n`;
  }

  //@ts-ignore
  tablecell(content: string, {header, align}) {
    const type = header ? 'th' : 'td';
    const tag = align
      ? `<${type} align="${align}">`
      : `<${type}>`;
    return `${tag + content}</${type}>\n`;
  }

  // span level renderer
  strong(text: string) {
    return `<strong>${text}</strong>`;
  }

  em(text: string) {
    return `<em>${text}</em>`;
  }

  codespan(text: string) {
    return `<code>${text}</code>`;
  }

  br() {
    return this.options?.xhtml ? '<br/>' : '<br>';
  }

  del(text: string) {
    return `<del>${text}</del>`;
  }

  link(href: string, title: string, text: string) {
    href = cleanUrl(this.options.sanitize as boolean, this.options.baseUrl!, href) as string;
    if (href === null) {
      return text;
    }
    let out = `<a href="${escape(href)}"`;
    if (title) {
      out += ` title="${title}"`;
    }
    out += `>${text}</a>`;
    return out;
  }

  image(href: string, title: string, text: string) {
    href = cleanUrl(this.options.sanitize!, this.options.baseUrl!, href) as string;
    if (href === null) {
      return text;
    }

    let out = `<img src="${href}" alt="${text}"`;
    if (title) {
      out += ` title="${title}"`;
    }
    out += this.options?.xhtml ? '/>' : '>';
    return out;
  }

  text(text: string) {
    return text;
  }
}

/**
 * TextRenderer
 * returns only the textual part of the token
 */

class TextRenderer {
  // no need for block level renderers
  strong = (text: string) => text;
  em = (text: string) => text;
  codespan = (text: string) => text;
  del = (text: string) => text;
  text = (text: string) => text;

  link = (href: string, title: string, text: string) => `${text}`;
  image = (href: string, title: string, text: string) => `${text}`;

  br() {
    return '';
  }
}

/**
 * Parsing & Compiling
 */

class Parser {
  /**
   * Static Parse Method
   */
  static parse(src: TokensList, options?: MarkedOptions) {
    const parser = new Parser(options);
    return parser.parse(src);
  };

  tokens: any;
  token: any;
  options: MarkedOptions;
  renderer: Renderer;
  slugger: Slugger;
  inline: any;
  inlineText: any;

  constructor(options?: MarkedOptions) {
    this.tokens = [];
    this.token = null;
    this.options = options || (marked.defaults as unknown as MarkedOptions);
    this.options.renderer = this.options?.renderer || new Renderer();
    this.renderer = this.options?.renderer;
    this.renderer.options = this.options;
    this.slugger = new Slugger();
  }

  /**
   * Parse Loop
   */

  parse(src: TokensList) {
    this.inline = new InlineLexer(src.links, this.options);
    // use an InlineLexer with a TextRenderer to extract pure text
    this.inlineText = new InlineLexer(
      src.links,
      merge({}, this.options, {renderer: new TextRenderer()})
    );
    this.tokens = src.reverse();

    let out = '';
    while (this.next()) {
      out += this.tok();
    }

    return out;
  }

  /**
   * Next Token
   */

  next() {
    return this.token = this.tokens.pop();
  }

  /**
   * Preview Next Token
   */

  peek() {
    return this.tokens[this.tokens.length - 1] || 0;
  }

  /**
   * Parse Text Tokens
   */

  parseText() {
    let body = this.token.text;

    while (this.peek().type === 'text') {
      body += `\n${this.next().text}`;
    }

    return this.inline.output(body);
  }

  /**
   * Parse Current Token
   */

  tok() {
    switch (this.token.type) {
      case 'space': {
        return '';
      }
      case 'hr': {
        return this.renderer.hr();
      }
      case 'heading': {
        return this.renderer.heading(
          this.inline.output(this.token.text),
          this.token.depth,
          unescape(this.inlineText.output(this.token.text)),
          this.slugger);
      }
      case 'code': {
        return this.renderer.code(this.token.text,
          this.token.lang,
          this.token.escaped);
      }
      case 'table': {
        let header = '';
        var body = '';
        let i;
        let row;
        let cell;
        let j;

        // header
        cell = '';
        for (i = 0; i < this.token.header.length; i++) {
          cell += this.renderer.tablecell(
            this.inline.output(this.token.header[i]),
            { header: true, align: this.token.align[i] }
          );
        }
        header += this.renderer.tablerow(cell);

        for (i = 0; i < this.token.cells.length; i++) {
          row = this.token.cells[i];

          cell = '';
          for (j = 0; j < row.length; j++) {
            cell += this.renderer.tablecell(
              this.inline.output(row[j]),
              { header: false, align: this.token.align[j] }
            );
          }

          body += this.renderer.tablerow(cell);
        }
        return this.renderer.table(header, body);
      }
      case 'blockquote_start': {
        body = '';

        while (this.next().type !== 'blockquote_end') {
          body += this.tok();
        }

        return this.renderer.blockquote(body);
      }
      case 'list_start': {
        body = '';
        const ordered = this.token.ordered;
        const start = this.token.start;

        while (this.next().type !== 'list_end') {
          body += this.tok();
        }

        return this.renderer.list(body, ordered, start);
      }
      case 'list_item_start': {
        body = '';
        const loose = this.token.loose;

        if (this.token.task) {
          body += this.renderer.checkbox(this.token.checked);
        }

        while (this.next().type !== 'list_item_end') {
          body += !loose && this.token.type === 'text'
            ? this.parseText()
            : this.tok();
        }

        return this.renderer.listitem(body);
      }
      case 'html': {
        // TODO parse inline content if parameter markdown=1
        return this.renderer.html(this.token.text);
      }
      case 'paragraph': {
        return this.renderer.paragraph(this.inline.output(this.token.text));
      }
      case 'text': {
        return this.renderer.paragraph(this.parseText());
      }
      default: {
        const errMsg = `Token with "${this.token.type}" type was not found.`;
        if (this.options?.silent) {
          console.log(errMsg);
        } else {
          throw new Error(errMsg);
        }
      }
    }
  }
}

/**
 * Slugger generates header id
 */

class Slugger {
  seen: {[key: string]: number};

  constructor() {
    this.seen = {};
  }

  /**
   * Convert string to unique id
   */

  slug(value: string) {
    let slug = value
      .toLowerCase()
      .trim()
      .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
      .replace(/\s/g, '-');

    if (this.seen.hasOwnProperty(slug)) {
      const originalSlug = slug;
      do {
        this.seen[originalSlug]++;
        slug = `${originalSlug}-${this.seen[originalSlug]}`;
      } while (this.seen.hasOwnProperty(slug));
    }
    this.seen[slug] = 0;

    return slug;
  }
}

/**
 * Helpers
 */

function escape(html: string, encode?: boolean) {
  if (encode) {
    if (escape.escapeTest.test(html)) {
      return html.replace(escape.escapeReplace, ch => escape.replacements[ch]);
    }
  } else {
    if (escape.escapeTestNoEncode.test(html)) {
      return html.replace(escape.escapeReplaceNoEncode, ch => escape.replacements[ch]);
    }
  }

  return html;
}

escape.escapeTest = /[&<>"']/;
escape.escapeReplace = /[&<>"']/g;
escape.replacements = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
} as any;

escape.escapeTestNoEncode = /[<>"']|&(?!#?\w+;)/;
escape.escapeReplaceNoEncode = /[<>"']|&(?!#?\w+;)/g;

function unescape(html: string) {
  // explicitly match decimal, hex, and named HTML entities
  return html.replace(/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig, (_, n) => {
    n = n.toLowerCase();
    if (n === 'colon') return ':';
    if (n.charAt(0) === '#') {
      return n.charAt(1) === 'x'
        ? String.fromCharCode(parseInt(n.substring(2), 16))
        : String.fromCharCode(+n.substring(1));
    }
    return '';
  });
}

function edit(regex: any, opt?: string) {
  regex = regex.source || regex;
  opt = opt || '';
  return {
    replace(name: any, val: any) {
      val = val.source || val;
      val = val.replace(/(^|[^\[])\^/g, '$1');
      regex = regex.replace(name, val);
      return this;
    },
    getRegex() {
      return new RegExp(regex, opt);
    }
  };
}

function cleanUrl(sanitize: boolean, base: string, href: string): string | null {
  if (sanitize) {
    try {
      var prot = decodeURIComponent(unescape(href))
        .replace(/[^\w:]/g, '')
        .toLowerCase();
    } catch (e) {
      return null;
    }
    if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0 || prot.indexOf('data:') === 0) {
      return null;
    }
  }
  if (base && !originIndependentUrl.test(href)) {
    href = resolveUrl(base, href);
  }
  try {
    href = encodeURI(href).replace(/%25/g, '%');
  } catch (e) {
    return null;
  }
  return href;
}

function resolveUrl(base: string, href: string) {
  if (!baseUrls[` ${base}`]) {
    // we can ignore everything in base after the last slash of its path component,
    // but we might need to add _that_
    // https://tools.ietf.org/html/rfc3986#section-3
    if (/^[^:]+:\/*[^/]*$/.test(base)) {
      baseUrls[` ${base}`] = `${base}/`;
    } else {
      baseUrls[` ${base}`] = rtrim(base, '/', true);
    }
  }
  base = baseUrls[` ${base}`];

  if (href.slice(0, 2) === '//') {
    return base.replace(/:[\s\S]*/, ':') + href;
  } else if (href.charAt(0) === '/') {
    return base.replace(/(:\/*[^/]*)[\s\S]*/, '$1') + href;
  } else {
    return base + href;
  }
}
var baseUrls: any = {} 
var originIndependentUrl = /^$|^[a-z][a-z0-9+.-]*:|^[?#]/i;

function noop() {}
noop.exec = noop;

function merge(obj: any, ...args: {[key: string]: any}[]) {
  let i = 0;
  let target;
  let key;

  for (; i < args.length; i++) {
    target = args[i];
    for (key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        obj[key] = target[key];
      }
    }
  }

  return obj;
}

function splitCells(tableRow: string, count: number | undefined = undefined) {
  // ensure that every cell-delimiting pipe has a space
  // before it to distinguish it from an escaped pipe
  const row = tableRow.replace(/\|/g, (match, offset, str) => {
        let escaped = false, curr = offset;
        while (--curr >= 0 && str[curr] === '\\') escaped = !escaped;
        if (escaped) {
          // odd number of slashes means | is escaped
          // so we leave it alone
          return '|';
        } else {
          // add space before unescaped |
          return ' |';
        }
      });

  const cells = row.split(/ \|/);
  let i = 0;

  if (count && cells.length > count) {
    cells.splice(count);
  } else {
    while (count && cells.length < count) cells.push('');
  }

  for (; i < cells.length; i++) {
    // leading or trailing whitespace is ignored per the gfm spec
    cells[i] = cells[i].trim().replace(/\\\|/g, '|');
  }
  return cells;
}

// Remove trailing 'c's. Equivalent to str.replace(/c*$/, '').
// /c*$/ is vulnerable to REDOS.
// invert: Remove suffix of non-c chars instead. Default falsey.
function rtrim(str: string, c: string, invert?: boolean) {
  if (str.length === 0) {
    return '';
  }

  // Length of suffix matching the invert condition.
  let suffLen = 0;

  // Step left until we fail to match the invert condition.
  while (suffLen < str.length) {
    const currChar = str.charAt(str.length - suffLen - 1);
    if (currChar === c && !invert) {
      suffLen++;
    } else if (currChar !== c && invert) {
      suffLen++;
    } else {
      break;
    }
  }

  return str.substr(0, str.length - suffLen);
}

type MarkedCallback = (error: any | undefined, parseResult?: string) => void;

/**
 * Marked
 */
function marked(src: string): string;
function marked(src: string, optOrCallback: MarkedOptions | MarkedCallback): void; 
function marked(src: string, optOrCallback?: MarkedOptions | MarkedCallback, callback?: MarkedCallback): string | void {
  // throw error in case of non string input
  if (typeof src === 'undefined' || src === null) {
    throw new Error('marked(): input parameter is undefined or null');
  }
  if (typeof src !== 'string') {
    throw new Error(`marked(): input parameter is of type ${Object.prototype.toString.call(src)}, string expected`);
  }

  let opt: MarkedOptions; // | null;

  if (callback || typeof optOrCallback === "function") {
    
    if (!callback) {
      callback = optOrCallback as MarkedCallback;
      //opt = null;
    }

    opt = merge({}, marked.defaults, optOrCallback || {}) as MarkedOptions;

    const highlight = opt.highlight;
    let tokens: TokensList;
    let pending: number;
    let i = 0;

    try {
      tokens = Lexer.lex(src, opt);
    } catch (e) {
      
      return callback(e);
    }

    pending = tokens.length;

    const done = (err?: any) => {
      if (err) {
        if (opt) opt.highlight = highlight;
        //@ts-ignore: callback not always defined
        callback(err)
      }

      let out;

      try {
        out = Parser.parse(tokens, opt);
      } catch (e) {
        err = e;
      }

      opt.highlight = highlight;

      //@ts-ignore: callback not always defined
      return err
        //@ts-ignore: callback not always defined
        ? callback(err)
        //@ts-ignore: callback not always defined
        : callback(null, out);
    };

    if (!highlight || highlight.length < 3) {
      return done();
    }

    delete opt.highlight;

    if (!pending) return done();

    for (; i < tokens.length; i++) {
      (t => {
        
        const token = (t as Token); 
        if (token.type !== 'code') {
          return --pending || done();
        }
        
        return highlight(token.text, token.lang!, (err: any, code: string) => {
          if (err) return done(err);
          if (code == null || code === token.text) {
            return --pending || done();
          }
          token.text = code;
          token.escaped = true;
          --pending || done();
        });
      })(tokens[i]);
    }

    return;
  }
  try {
    //@ts-ignore: is defined in scope, but TS complains 
    if (opt) opt = merge({}, marked.defaults, opt);
    //@ts-ignore
    return Parser.parse(Lexer.lex(src, opt), opt);
  } catch (e) {
    e.message += '\nPlease report this to https://github.com/markedjs/marked.';
    //@ts-ignore
    if (opt || (marked.defaults).silent) {
      return `<p>An error occurred:</p><pre>${escape(`${e.message}`, true)}</pre>`;
    }
    throw e;
  }
}

/**
 * Options
 */

marked.options =
marked.setOptions = (opt: MarkedOptions) => {
  merge(marked.defaults, opt);
  return marked;
};

marked.getDefaults = () => ({
  baseUrl: null,
  breaks: false,
  gfm: true,
  headerIds: true,
  headerPrefix: '',
  highlight: null,
  langPrefix: 'language-',
  mangle: true,
  pedantic: false,
  renderer: new Renderer(),
  sanitize: false,
  sanitizer: null,
  silent: false,
  smartLists: false,
  smartypants: false,
  tables: true,
  xhtml: false
});

marked.defaults = marked.getDefaults();

/**
 * Expose
 */

marked.Parser = Parser;
marked.parser = Parser.parse;

marked.Renderer = Renderer;
marked.TextRenderer = TextRenderer;

marked.Lexer = Lexer;
marked.lexer = Lexer.lex;

marked.InlineLexer = InlineLexer;
marked.inlineLexer = InlineLexer.output;

marked.Slugger = Slugger;

marked.parse = marked;

export default marked;
