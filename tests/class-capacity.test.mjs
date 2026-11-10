import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {readOperatingPolicy} from '../lib/lantern/operations.mjs';

test('D1 supports 100 classrooms while preserving file limits and the capacity guard',async()=>{
 const db=new DatabaseSync(':memory:');
 for(const name of fs.readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())db.exec(fs.readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
 const env={FILE_STORAGE:'d1',DB:{prepare(query){return {async first(){return db.prepare(query).get()},async run(){return db.prepare(query).run()}}}}};
 const policy=await readOperatingPolicy(env);
 assert.equal(policy.maxClasses,100);
 assert.equal(policy.maxFileBytes,1048576);
 assert.equal(policy.totalBytes,100*1048576);
 assert.equal(policy.classBytes,16*1048576);
 const insert=db.prepare('INSERT INTO classrooms(id,school,label,teacher_password,class_code,created) VALUES(?,?,?,?,?,?)');
 for(let i=0;i<100;i++)insert.run('room-'+i,'가상초등학교',String(i),'unused','unused',i);
 assert.throws(()=>insert.run('overflow','가상초등학교','초과','unused','unused',101),/CLASS_CAPACITY/);
 db.exec(`INSERT INTO settings(key,value) VALUES('operating_policy','{"maxClasses":200}')`);
 assert.equal((await readOperatingPolicy(env)).maxClasses,100);
 assert.throws(()=>insert.run('overflow','가상초등학교','초과','unused','unused',101),/CLASS_CAPACITY/);
 db.close();
});
