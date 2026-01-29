import { _ as defineProperty } from '@swc/helpers/_/_define_property';
import { _ as initializerDefineProperty } from '@swc/helpers/_/_initializer_define_property';

if (typeof globalThis !== 'undefined') {
  if (typeof globalThis._define_property === 'undefined') {
    globalThis._define_property = defineProperty;
  }
  if (typeof globalThis._initializer_define_property === 'undefined') {
    globalThis._initializer_define_property = initializerDefineProperty;
  }
}
