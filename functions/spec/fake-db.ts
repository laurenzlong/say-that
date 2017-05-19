import * as _ from 'lodash';
import * as mock from 'mock-require';

let _values;
let pushCount;
reset();

export function reset() {
  _values = {};
  pushCount = 0;
}

export function has(path: string): boolean {
  return _values.hasOwnProperty(path);
}

export function get(path: string): Promise<string> {
  if (!_values.hasOwnProperty(path)) {
    return Promise.resolve(null);
  }
  return Promise.resolve(_values[path]);
}

export function set(path: string, value: any): Promise<void> {
  _values[path] = value;
  return Promise.resolve();
}

export function push(path: string, value: any): Promise<any> {
  _values[`${path}/pushprefix-${pushCount}`] = value;
  pushCount++;
  return Promise.resolve();
}

export function remove(path: string): Promise<void> {
  delete _values[path];
  return Promise.resolve();
}

export async function transaction(path: string, callback): Promise<any> {
  return set(path, callback(await get(path)));
}

export function values() {
  return _values;
}

export function init(otherModule: string) {
  mock(otherModule, './fake-db');
}
