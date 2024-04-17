/*
 * Copyright 2024 American Express Travel Related Services Company, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

const { formatRelative, formatDistanceStrict } = require('date-fns');
const { createColors } = require('colorette');

function colors(supportMarkdown = true) {
  const useMarkdown = process.env.MARKDOWN === 'true';
  const colorette = createColors({ useColor: !useMarkdown });
  if (!useMarkdown || !supportMarkdown) return colorette;
  return {
    ...colorette,
    bold: (str) => `**${str}**`,
    italic: (str) => `_${str}_`,
    strikethrough: (str) => `~~${str}~~`,
    underline: (str) => `<u>${str}</u>`,
  };
}

function nth(n) {
  switch (true) {
    case n % 100 === 11:
    case n % 100 === 12:
    case n % 100 === 13:
      return `${n}th`;
    case n % 10 === 1:
      return `${n}st`;
    case n % 10 === 2:
      return `${n}nd`;
    case n % 10 === 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function float(n, precision = 3) {
  return Number(n.toFixed(precision)).toString();
}

function append(unit, format = float) {
  return (n) => `${format(n)}${unit}`;
}

function percent(n) {
  return `${float(n * 100)}%`;
}

function bytes(n) {
  if (n === 0) return '0B';
  if (n < 1e3) return `${float(n, 0)}B`;
  if (n < 1e6) return `${float(n / 1e3)}kB`;
  if (n < 1e9) return `${float(n / 1e6)}MB`;
  return `${float(n / 1e9)}GB`;
}

function pValue(p, alpha = 0.05) {
  const { red, bold } = colors();
  if (p < 0.001) return red(bold('*<0.001'));
  if (p <= alpha) return red(`*${float(p)}`);
  return float(p);
}

function seconds(n) {
  if (n === 0) return '0s';
  if (n < 1e-6) return `${float(n * 1e9)}ns`;
  if (n < 1e-3) return `${float(n * 1e6)}µs`;
  if (n < 1) return `${float(n * 1e3)}ms`;
  if (n < 60) return `${float(n, 2)}s`;
  if (n < 3600) return `${Math.floor(n / 60)}m ${seconds(n % 60)}`;
  return `${Math.floor(n / 3600)}h ${seconds(n % 3600)}`;
}

function milliseconds(n) {
  return seconds(n / 1e3);
}

function diff(c, v, format) {
  const { green, red, bold } = colors(false);
  const d = c - v;
  if (d === 0) return `=${format(d)}`;
  if (d > 0) return green(`${bold('-')}${format(d)} (${bold('-')}${percent(d / c)})`);
  return red(`${bold('+')}${format(d * -1)} (${bold('+')}${percent((d / c) * -1)})`);
}

function capitalize(string) {
  return string.replace(/^\w/, (c) => c.toUpperCase());
}

function testType(type) {
  const { bold } = colors();
  return `Test type: ${bold(capitalize(type))}`;
}

function time(timestamp, prefix) {
  const { bold } = colors();
  const relative = formatRelative(timestamp, Date.now());
  if (prefix) return `${prefix} ${bold(capitalize(relative))}`;
  return capitalize(relative);
}

function timeDiff(start, end, prefix) {
  const { bold } = colors();
  const formatted = formatDistanceStrict(end, start);
  if (prefix) return `${prefix} ${bold(formatted)}`;
  return formatted;
}

module.exports = {
  nth,
  colors,
  diff,
  float,
  append,
  percent,
  bytes,
  pValue,
  seconds,
  milliseconds,
  capitalize,
  testType,
  time,
  timeDiff,
};
