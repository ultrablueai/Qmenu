import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const mw=readFileSync('middleware.ts','utf8');
const login=readFileSync('app/login/page.tsx','utf8');
const owner=readFileSync('app/admin/page.tsx','utf8');
test('owner session refresh is covered',()=>{assert.ok(mw.includes('/admin/:path*'));assert.ok(mw.includes('auth.getUser()'));});
test('owner login safely returns to owner page',()=>{assert.ok(owner.includes('/login?next=/admin'));assert.ok(login.includes('target === "/admin" ? "/admin" : "/dashboard"'));assert.ok(!login.includes('location.replace(target)'));});
