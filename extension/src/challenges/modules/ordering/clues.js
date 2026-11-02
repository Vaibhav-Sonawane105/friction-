export function matches(order, {
  kind,
  a,
  b,
  c,
  n
}) {
  const i = order.indexOf(a),
    j = order.indexOf(b),
    k = order.indexOf(c);
  switch (kind) {
    case 'end':
      return i === 0 || i === order.length - 1;
    case 'before':
      return i < j;
    case 'next':
      return i + 1 === j;
    case 'apart':
      return Math.abs(i - j) > 1;
    case 'between':
      return Math.min(j, k) < i && i < Math.max(j, k);
    case 'gap':
      return j - i === n + 1;
    default:
      return false;
  }
}
export function describe({
  kind,
  a,
  b,
  c,
  n
}) {
  switch (kind) {
    case 'end':
      return a + ' is at either end.';
    case 'before':
      return a + ' comes before ' + b + '.';
    case 'next':
      return a + ' is immediately before ' + b + '.';
    case 'apart':
      return a + ' is not beside ' + b + '.';
    case 'between':
      return a + ' is somewhere between ' + b + ' and ' + c + '.';
    case 'gap':
      return 'Exactly ' + n + ' object' + (n === 1 ? ' lies' : 's lie') + ' between ' + a + ' and ' + b + ', with ' + a + ' first.';
    default:
      throw Error('Unknown clue.');
  }
}
export function brokenClueIds(order, clues) {
  return clues.flatMap((c, i) => matches(order, c) ? [] : [i]);
}
