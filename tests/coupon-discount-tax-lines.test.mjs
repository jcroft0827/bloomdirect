import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
function loadTs(path, imports={}) {
  const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {}, {filename:path})((id)=>imports[id]??require(id),module,module.exports);
  return module.exports;
}
const allocator=loadTs('src/lib/bloom-websites/coupons/allocateMerchandiseDiscount.ts');
const {buildDiscountedTaxLines}=loadTs('src/lib/bloom-websites/coupons/buildDiscountedTaxLines.ts', {'./allocateMerchandiseDiscount':allocator});
const lines=[
  {referenceId:'p1',kind:'product',amountCents:7000,quantity:1,unitAmountCents:7000,taxability:'taxable',taxRatePercent:8},
  {referenceId:'a1',kind:'addon',amountCents:3000,quantity:1,unitAmountCents:3000,taxability:'non_taxable',taxRatePercent:0},
  {referenceId:'delivery',kind:'delivery',amountCents:1200,quantity:1,unitAmountCents:1200,taxability:'taxable',taxRatePercent:8},
  {referenceId:'tip',kind:'tip',amountCents:1000,quantity:1,unitAmountCents:1000,taxability:'non_taxable',taxRatePercent:0},
];
test('discount allocated to merchandise preserving other fees and line metadata',()=>{
  const result=buildDiscountedTaxLines(lines,1000);
  assert.deepEqual(result.map(l=>l.amountCents),[6300,2700,1200,1000]);
  assert.deepEqual(result.map(l=>l.taxability),lines.map(l=>l.taxability));
  assert.deepEqual(lines.map(l=>l.amountCents),[7000,3000,1200,1000]);
});
test('whole-merchandise discount retains non-merchandise lines',()=>{
  assert.deepEqual(buildDiscountedTaxLines(lines,10000).map(l=>l.amountCents),[0,0,1200,1000]);
});
test('zero discount does not alter amounts',()=>{
  assert.deepEqual(JSON.parse(JSON.stringify(buildDiscountedTaxLines(lines,0))),lines);
});
test('rejects excessive or negative discounts',()=>{
  assert.throws(()=>buildDiscountedTaxLines(lines,10001),{name:'RangeError'});
  assert.throws(()=>buildDiscountedTaxLines(lines,-1),{name:'RangeError'});
});
test('rejects duplicate merchandise references',()=>{
  assert.throws(()=>buildDiscountedTaxLines([...lines, lines[0]],100),{name:'RangeError'});
});
test('one-cent allocation is deterministic with uneven tax rates',()=>{
  const result=buildDiscountedTaxLines([{...lines[0],amountCents:1}, {...lines[1],amountCents:2}],1);
  assert.deepEqual(result.map(l=>l.amountCents),[1,1]);
});
