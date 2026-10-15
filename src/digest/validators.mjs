"use strict";
import __ajvRuntime0 from "ajv/dist/runtime/ucs2length.js";
export const validateCallDigest = validate20;
const schema31 = {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://schemas.observertc.org/digest/v1/call-digest.json","type":"object","additionalProperties":true,"required":["kind","schemaVersion","digestId","tenantId","callId","roomId","revision","provenance","lifecycle","range","coverage","capabilities","sources","usage","joins","impairments","metrics","findingCounts","participants","streamDetails","pathDetails","timeline","findings"],"properties":{"kind":{"const":"call-digest"},"schemaVersion":{"const":1},"digestId":{"$ref":"common.json#/$defs/opaqueId"},"tenantId":{"$ref":"common.json#/$defs/opaqueId"},"callId":{"$ref":"common.json#/$defs/opaqueId"},"roomId":{"oneOf":[{"$ref":"common.json#/$defs/opaqueId"},{"type":"null"}]},"revision":{"$ref":"common.json#/$defs/opaqueId"},"provenance":{"$ref":"common.json#/$defs/provenance"},"lifecycle":{"enum":["open","closed","unknown"]},"range":{"oneOf":[{"$ref":"common.json#/$defs/timeRange"},{"type":"null"}]},"coverage":{"$ref":"common.json#/$defs/coverage"},"capabilities":{"$ref":"common.json#/$defs/capabilityMap"},"sources":{"type":"array","items":{"$ref":"common.json#/$defs/source"},"maxItems":4096},"usage":{"type":"object","additionalProperties":false,"required":["participantSessions","peakConcurrentParticipants","observedParticipantMs","connectedParticipantMs","callDurationMs"],"properties":{"participantSessions":{"$ref":"common.json#/$defs/nullableCount"},"peakConcurrentParticipants":{"$ref":"common.json#/$defs/nullableCount"},"observedParticipantMs":{"$ref":"common.json#/$defs/durationMs"},"connectedParticipantMs":{"$ref":"common.json#/$defs/nullableDurationMs"},"callDurationMs":{"$ref":"common.json#/$defs/nullableDurationMs"}}},"joins":{"$ref":"common.json#/$defs/joinAggregate"},"impairments":{"$ref":"common.json#/$defs/impairmentExposures"},"metrics":{"$ref":"common.json#/$defs/metricAggregates"},"findingCounts":{"$ref":"common.json#/$defs/findingCounts"},"participants":{"$ref":"common.json#/$defs/nullableResourceRef"},"streamDetails":{"$ref":"common.json#/$defs/nullableResourceRef"},"pathDetails":{"$ref":"common.json#/$defs/nullableResourceRef"},"timeline":{"$ref":"common.json#/$defs/nullableResourceRef"},"findings":{"$ref":"common.json#/$defs/nullableResourceRef"}}};
const schema33 = {"type":"string","minLength":1,"maxLength":512};
const schema54 = {"type":"number","minimum":0,"maximum":9007199254740991};
const func1 = __ajvRuntime0.default;
const schema38 = {"type":"object","additionalProperties":false,"required":["processorVersion","policyId","sourceRevision","generatedAt"],"properties":{"processorVersion":{"$ref":"#/$defs/opaqueId"},"policyId":{"$ref":"#/$defs/opaqueId"},"sourceRevision":{"$ref":"#/$defs/opaqueId"},"generatedAt":{"$ref":"#/$defs/epochMs"}}};
const schema42 = {"type":"integer","minimum":-8640000000000000,"maximum":8640000000000000};

function validate22(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate22.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.processorVersion === undefined) && (missing0 = "processorVersion")) || ((data.policyId === undefined) && (missing0 = "policyId"))) || ((data.sourceRevision === undefined) && (missing0 = "sourceRevision"))) || ((data.generatedAt === undefined) && (missing0 = "generatedAt"))){
validate22.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "processorVersion") || (key0 === "policyId")) || (key0 === "sourceRevision")) || (key0 === "generatedAt"))){
validate22.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.processorVersion !== undefined){
let data0 = data.processorVersion;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 512){
validate22.errors = [{instancePath:instancePath+"/processorVersion",schemaPath:"#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data0) < 1){
validate22.errors = [{instancePath:instancePath+"/processorVersion",schemaPath:"#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate22.errors = [{instancePath:instancePath+"/processorVersion",schemaPath:"#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.policyId !== undefined){
let data1 = data.policyId;
const _errs5 = errors;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data1 === "string"){
if(func1(data1) > 512){
validate22.errors = [{instancePath:instancePath+"/policyId",schemaPath:"#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data1) < 1){
validate22.errors = [{instancePath:instancePath+"/policyId",schemaPath:"#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate22.errors = [{instancePath:instancePath+"/policyId",schemaPath:"#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sourceRevision !== undefined){
let data2 = data.sourceRevision;
const _errs8 = errors;
const _errs9 = errors;
if(errors === _errs9){
if(typeof data2 === "string"){
if(func1(data2) > 512){
validate22.errors = [{instancePath:instancePath+"/sourceRevision",schemaPath:"#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data2) < 1){
validate22.errors = [{instancePath:instancePath+"/sourceRevision",schemaPath:"#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate22.errors = [{instancePath:instancePath+"/sourceRevision",schemaPath:"#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.generatedAt !== undefined){
let data3 = data.generatedAt;
const _errs11 = errors;
const _errs12 = errors;
if(!((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3)))){
validate22.errors = [{instancePath:instancePath+"/generatedAt",schemaPath:"#/$defs/epochMs/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs12){
if(typeof data3 == "number"){
if(data3 > 8640000000000000 || isNaN(data3)){
validate22.errors = [{instancePath:instancePath+"/generatedAt",schemaPath:"#/$defs/epochMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 8640000000000000},message:"must be <= 8640000000000000"}];
return false;
}
else {
if(data3 < -8640000000000000 || isNaN(data3)){
validate22.errors = [{instancePath:instancePath+"/generatedAt",schemaPath:"#/$defs/epochMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: -8640000000000000},message:"must be >= -8640000000000000"}];
return false;
}
}
}
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate22.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate22.errors = vErrors;
return errors === 0;
}
validate22.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema43 = {"type":"object","additionalProperties":false,"required":["startAt","endAt"],"properties":{"startAt":{"$ref":"#/$defs/epochMs"},"endAt":{"$ref":"#/$defs/epochMs"}}};

function validate24(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate24.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.startAt === undefined) && (missing0 = "startAt")) || ((data.endAt === undefined) && (missing0 = "endAt"))){
validate24.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((key0 === "startAt") || (key0 === "endAt"))){
validate24.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.startAt !== undefined){
let data0 = data.startAt;
const _errs2 = errors;
const _errs3 = errors;
if(!((typeof data0 == "number") && (!(data0 % 1) && !isNaN(data0)))){
validate24.errors = [{instancePath:instancePath+"/startAt",schemaPath:"#/$defs/epochMs/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs3){
if(typeof data0 == "number"){
if(data0 > 8640000000000000 || isNaN(data0)){
validate24.errors = [{instancePath:instancePath+"/startAt",schemaPath:"#/$defs/epochMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 8640000000000000},message:"must be <= 8640000000000000"}];
return false;
}
else {
if(data0 < -8640000000000000 || isNaN(data0)){
validate24.errors = [{instancePath:instancePath+"/startAt",schemaPath:"#/$defs/epochMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: -8640000000000000},message:"must be >= -8640000000000000"}];
return false;
}
}
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.endAt !== undefined){
let data1 = data.endAt;
const _errs5 = errors;
const _errs6 = errors;
if(!((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1)))){
validate24.errors = [{instancePath:instancePath+"/endAt",schemaPath:"#/$defs/epochMs/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs6){
if(typeof data1 == "number"){
if(data1 > 8640000000000000 || isNaN(data1)){
validate24.errors = [{instancePath:instancePath+"/endAt",schemaPath:"#/$defs/epochMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 8640000000000000},message:"must be <= 8640000000000000"}];
return false;
}
else {
if(data1 < -8640000000000000 || isNaN(data1)){
validate24.errors = [{instancePath:instancePath+"/endAt",schemaPath:"#/$defs/epochMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: -8640000000000000},message:"must be >= -8640000000000000"}];
return false;
}
}
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
else {
validate24.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate24.errors = vErrors;
return errors === 0;
}
validate24.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema46 = {"type":"object","additionalProperties":false,"required":["completeness","expectedSources","processedSources","rejectedRecords","duplicateRecords","gapDurationMs","truncated","warnings"],"properties":{"completeness":{"$ref":"#/$defs/completeness"},"expectedSources":{"$ref":"#/$defs/nullableCount"},"processedSources":{"$ref":"#/$defs/count"},"rejectedRecords":{"$ref":"#/$defs/count"},"duplicateRecords":{"$ref":"#/$defs/count"},"gapDurationMs":{"$ref":"#/$defs/nullableDurationMs"},"truncated":{"type":"boolean"},"warnings":{"$ref":"#/$defs/reasonCodes"}}};
const schema47 = {"enum":["complete","partial","unknown"]};
const schema49 = {"type":"integer","minimum":0,"maximum":9007199254740991};
const schema48 = {"oneOf":[{"$ref":"#/$defs/count"},{"type":"null"}]};

function validate27(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate27.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
const _errs2 = errors;
if(!((typeof data == "number") && (!(data % 1) && !isNaN(data)))){
const err0 = {instancePath,schemaPath:"#/$defs/count/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(errors === _errs2){
if(typeof data == "number"){
if(data > 9007199254740991 || isNaN(data)){
const err1 = {instancePath,schemaPath:"#/$defs/count/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
else {
if(data < 0 || isNaN(data)){
const err2 = {instancePath,schemaPath:"#/$defs/count/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
}
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
}
const _errs4 = errors;
if(data !== null){
const err3 = {instancePath,schemaPath:"#/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
var _valid0 = _errs4 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
}
}
if(!valid0){
const err4 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
validate27.errors = vErrors;
return false;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate27.errors = vErrors;
return errors === 0;
}
validate27.evaluated = {"dynamicProps":false,"dynamicItems":false};

const schema53 = {"oneOf":[{"$ref":"#/$defs/durationMs"},{"type":"null"}]};

function validate29(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate29.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
const _errs2 = errors;
if(errors === _errs2){
if(typeof data == "number"){
if(data > 9007199254740991 || isNaN(data)){
const err0 = {instancePath,schemaPath:"#/$defs/durationMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(data < 0 || isNaN(data)){
const err1 = {instancePath,schemaPath:"#/$defs/durationMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
else {
const err2 = {instancePath,schemaPath:"#/$defs/durationMs/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
}
const _errs4 = errors;
if(data !== null){
const err3 = {instancePath,schemaPath:"#/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
var _valid0 = _errs4 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
}
}
if(!valid0){
const err4 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
validate29.errors = vErrors;
return false;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate29.errors = vErrors;
return errors === 0;
}
validate29.evaluated = {"dynamicProps":false,"dynamicItems":false};

const schema55 = {"type":"array","items":{"$ref":"#/$defs/reasonCode"},"maxItems":64};
const schema56 = {"type":"string","minLength":1,"maxLength":128,"pattern":"^[a-z0-9]+(?:[-.][a-z0-9]+)*$"};
const pattern4 = new RegExp("^[a-z0-9]+(?:[-.][a-z0-9]+)*$", "u");

function validate31(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate31.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(Array.isArray(data)){
if(data.length > 64){
validate31.errors = [{instancePath,schemaPath:"#/maxItems",keyword:"maxItems",params:{limit: 64},message:"must NOT have more than 64 items"}];
return false;
}
else {
var valid0 = true;
const len0 = data.length;
for(let i0=0; i0<len0; i0++){
let data0 = data[i0];
const _errs1 = errors;
const _errs2 = errors;
if(errors === _errs2){
if(typeof data0 === "string"){
if(func1(data0) > 128){
validate31.errors = [{instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/reasonCode/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"}];
return false;
}
else {
if(func1(data0) < 1){
validate31.errors = [{instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/reasonCode/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
else {
if(!pattern4.test(data0)){
validate31.errors = [{instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/reasonCode/pattern",keyword:"pattern",params:{pattern: "^[a-z0-9]+(?:[-.][a-z0-9]+)*$"},message:"must match pattern \""+"^[a-z0-9]+(?:[-.][a-z0-9]+)*$"+"\""}];
return false;
}
}
}
}
else {
validate31.errors = [{instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/reasonCode/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs1 === errors;
if(!valid0){
break;
}
}
}
}
else {
validate31.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
validate31.errors = vErrors;
return errors === 0;
}
validate31.evaluated = {"items":true,"dynamicProps":false,"dynamicItems":false};


function validate26(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate26.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((((data.completeness === undefined) && (missing0 = "completeness")) || ((data.expectedSources === undefined) && (missing0 = "expectedSources"))) || ((data.processedSources === undefined) && (missing0 = "processedSources"))) || ((data.rejectedRecords === undefined) && (missing0 = "rejectedRecords"))) || ((data.duplicateRecords === undefined) && (missing0 = "duplicateRecords"))) || ((data.gapDurationMs === undefined) && (missing0 = "gapDurationMs"))) || ((data.truncated === undefined) && (missing0 = "truncated"))) || ((data.warnings === undefined) && (missing0 = "warnings"))){
validate26.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((((key0 === "completeness") || (key0 === "expectedSources")) || (key0 === "processedSources")) || (key0 === "rejectedRecords")) || (key0 === "duplicateRecords")) || (key0 === "gapDurationMs")) || (key0 === "truncated")) || (key0 === "warnings"))){
validate26.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.completeness !== undefined){
let data0 = data.completeness;
const _errs2 = errors;
if(!(((data0 === "complete") || (data0 === "partial")) || (data0 === "unknown"))){
validate26.errors = [{instancePath:instancePath+"/completeness",schemaPath:"#/$defs/completeness/enum",keyword:"enum",params:{allowedValues: schema47.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.expectedSources !== undefined){
const _errs4 = errors;
if(!(validate27(data.expectedSources, {instancePath:instancePath+"/expectedSources",parentData:data,parentDataProperty:"expectedSources",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
errors = vErrors.length;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.processedSources !== undefined){
let data2 = data.processedSources;
const _errs5 = errors;
const _errs6 = errors;
if(!((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2)))){
validate26.errors = [{instancePath:instancePath+"/processedSources",schemaPath:"#/$defs/count/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs6){
if(typeof data2 == "number"){
if(data2 > 9007199254740991 || isNaN(data2)){
validate26.errors = [{instancePath:instancePath+"/processedSources",schemaPath:"#/$defs/count/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data2 < 0 || isNaN(data2)){
validate26.errors = [{instancePath:instancePath+"/processedSources",schemaPath:"#/$defs/count/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.rejectedRecords !== undefined){
let data3 = data.rejectedRecords;
const _errs8 = errors;
const _errs9 = errors;
if(!((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3)))){
validate26.errors = [{instancePath:instancePath+"/rejectedRecords",schemaPath:"#/$defs/count/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs9){
if(typeof data3 == "number"){
if(data3 > 9007199254740991 || isNaN(data3)){
validate26.errors = [{instancePath:instancePath+"/rejectedRecords",schemaPath:"#/$defs/count/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data3 < 0 || isNaN(data3)){
validate26.errors = [{instancePath:instancePath+"/rejectedRecords",schemaPath:"#/$defs/count/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.duplicateRecords !== undefined){
let data4 = data.duplicateRecords;
const _errs11 = errors;
const _errs12 = errors;
if(!((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4)))){
validate26.errors = [{instancePath:instancePath+"/duplicateRecords",schemaPath:"#/$defs/count/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs12){
if(typeof data4 == "number"){
if(data4 > 9007199254740991 || isNaN(data4)){
validate26.errors = [{instancePath:instancePath+"/duplicateRecords",schemaPath:"#/$defs/count/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data4 < 0 || isNaN(data4)){
validate26.errors = [{instancePath:instancePath+"/duplicateRecords",schemaPath:"#/$defs/count/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.gapDurationMs !== undefined){
const _errs14 = errors;
if(!(validate29(data.gapDurationMs, {instancePath:instancePath+"/gapDurationMs",parentData:data,parentDataProperty:"gapDurationMs",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate29.errors : vErrors.concat(validate29.errors);
errors = vErrors.length;
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.truncated !== undefined){
const _errs15 = errors;
if(typeof data.truncated !== "boolean"){
validate26.errors = [{instancePath:instancePath+"/truncated",schemaPath:"#/properties/truncated/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.warnings !== undefined){
const _errs17 = errors;
if(!(validate31(data.warnings, {instancePath:instancePath+"/warnings",parentData:data,parentDataProperty:"warnings",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate31.errors : vErrors.concat(validate31.errors);
errors = vErrors.length;
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
else {
validate26.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate26.errors = vErrors;
return errors === 0;
}
validate26.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema57 = {"type":"object","additionalProperties":{"$ref":"#/$defs/capability"},"propertyNames":{"type":"string","minLength":1,"maxLength":64}};
const schema58 = {"type":"object","additionalProperties":false,"required":["state","reasons"],"properties":{"state":{"$ref":"#/$defs/capabilityState"},"reasons":{"$ref":"#/$defs/reasonCodes"}},"if":{"properties":{"state":{"const":"unavailable"}}},"then":{"properties":{"reasons":{"minItems":1}}}};
const schema59 = {"enum":["available","partial","unavailable"]};

function validate35(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate35.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs1 = errors;
let valid0 = true;
const _errs2 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.state !== undefined){
if("unavailable" !== data.state){
const err0 = {};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
}
}
var _valid0 = _errs2 === errors;
errors = _errs1;
if(vErrors !== null){
if(_errs1){
vErrors.length = _errs1;
}
else {
vErrors = null;
}
}
if(_valid0){
const _errs4 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.reasons !== undefined){
let data1 = data.reasons;
if(Array.isArray(data1)){
if(data1.length < 1){
validate35.errors = [{instancePath:instancePath+"/reasons",schemaPath:"#/then/properties/reasons/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"}];
return false;
}
}
}
}
var _valid0 = _errs4 === errors;
valid0 = _valid0;
if(valid0){
var props0 = {};
props0.reasons = true;
props0.state = true;
}
}
if(!valid0){
const err1 = {instancePath,schemaPath:"#/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
validate35.errors = vErrors;
return false;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.state === undefined) && (missing0 = "state")) || ((data.reasons === undefined) && (missing0 = "reasons"))){
validate35.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs6 = errors;
for(const key0 in data){
if(!((key0 === "state") || (key0 === "reasons"))){
validate35.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs6 === errors){
if(data.state !== undefined){
let data2 = data.state;
const _errs7 = errors;
if(!(((data2 === "available") || (data2 === "partial")) || (data2 === "unavailable"))){
validate35.errors = [{instancePath:instancePath+"/state",schemaPath:"#/$defs/capabilityState/enum",keyword:"enum",params:{allowedValues: schema59.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid3 = _errs7 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.reasons !== undefined){
const _errs9 = errors;
if(!(validate31(data.reasons, {instancePath:instancePath+"/reasons",parentData:data,parentDataProperty:"reasons",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate31.errors : vErrors.concat(validate31.errors);
errors = vErrors.length;
}
var valid3 = _errs9 === errors;
}
else {
var valid3 = true;
}
}
}
}
}
else {
validate35.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate35.errors = vErrors;
return errors === 0;
}
validate35.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate34(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate34.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
for(const key0 in data){
const _errs1 = errors;
if(errors === _errs1){
if(typeof key0 === "string"){
if(func1(key0) > 64){
const err0 = {instancePath,schemaPath:"#/propertyNames/maxLength",keyword:"maxLength",params:{limit: 64},message:"must NOT have more than 64 characters",propertyName:key0};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(func1(key0) < 1){
const err1 = {instancePath,schemaPath:"#/propertyNames/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters",propertyName:key0};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
else {
const err2 = {instancePath,schemaPath:"#/propertyNames/type",keyword:"type",params:{type: "string"},message:"must be string",propertyName:key0};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
var valid0 = _errs1 === errors;
if(!valid0){
const err3 = {instancePath,schemaPath:"#/propertyNames",keyword:"propertyNames",params:{propertyName: key0},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
validate34.errors = vErrors;
return false;
break;
}
}
if(valid0){
for(const key1 in data){
const _errs4 = errors;
if(!(validate35(data[key1], {instancePath:instancePath+"/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"),parentData:data,parentDataProperty:key1,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate35.errors : vErrors.concat(validate35.errors);
errors = vErrors.length;
}
var valid1 = _errs4 === errors;
if(!valid1){
break;
}
}
}
}
else {
validate34.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate34.errors = vErrors;
return errors === 0;
}
validate34.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema60 = {"type":"object","additionalProperties":false,"required":["sourceId","kind","logicalKey","revision"],"properties":{"sourceId":{"$ref":"#/$defs/opaqueId"},"kind":{"$ref":"#/$defs/sourceKind"},"logicalKey":{"$ref":"#/$defs/opaqueId"},"revision":{"$ref":"#/$defs/opaqueId"}}};
const schema62 = {"enum":["client-samples","observer-summary","observer-events","application-events","router-samples"]};

function validate39(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate39.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.sourceId === undefined) && (missing0 = "sourceId")) || ((data.kind === undefined) && (missing0 = "kind"))) || ((data.logicalKey === undefined) && (missing0 = "logicalKey"))) || ((data.revision === undefined) && (missing0 = "revision"))){
validate39.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "sourceId") || (key0 === "kind")) || (key0 === "logicalKey")) || (key0 === "revision"))){
validate39.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.sourceId !== undefined){
let data0 = data.sourceId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 512){
validate39.errors = [{instancePath:instancePath+"/sourceId",schemaPath:"#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data0) < 1){
validate39.errors = [{instancePath:instancePath+"/sourceId",schemaPath:"#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate39.errors = [{instancePath:instancePath+"/sourceId",schemaPath:"#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.kind !== undefined){
let data1 = data.kind;
const _errs5 = errors;
if(!(((((data1 === "client-samples") || (data1 === "observer-summary")) || (data1 === "observer-events")) || (data1 === "application-events")) || (data1 === "router-samples"))){
validate39.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/$defs/sourceKind/enum",keyword:"enum",params:{allowedValues: schema62.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.logicalKey !== undefined){
let data2 = data.logicalKey;
const _errs7 = errors;
const _errs8 = errors;
if(errors === _errs8){
if(typeof data2 === "string"){
if(func1(data2) > 512){
validate39.errors = [{instancePath:instancePath+"/logicalKey",schemaPath:"#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data2) < 1){
validate39.errors = [{instancePath:instancePath+"/logicalKey",schemaPath:"#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate39.errors = [{instancePath:instancePath+"/logicalKey",schemaPath:"#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.revision !== undefined){
let data3 = data.revision;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data3 === "string"){
if(func1(data3) > 512){
validate39.errors = [{instancePath:instancePath+"/revision",schemaPath:"#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data3) < 1){
validate39.errors = [{instancePath:instancePath+"/revision",schemaPath:"#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate39.errors = [{instancePath:instancePath+"/revision",schemaPath:"#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate39.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate39.errors = vErrors;
return errors === 0;
}
validate39.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate41(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate41.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
const _errs2 = errors;
if(!((typeof data == "number") && (!(data % 1) && !isNaN(data)))){
const err0 = {instancePath,schemaPath:"#/$defs/count/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(errors === _errs2){
if(typeof data == "number"){
if(data > 9007199254740991 || isNaN(data)){
const err1 = {instancePath,schemaPath:"#/$defs/count/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
else {
if(data < 0 || isNaN(data)){
const err2 = {instancePath,schemaPath:"#/$defs/count/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
}
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
}
const _errs4 = errors;
if(data !== null){
const err3 = {instancePath,schemaPath:"#/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
var _valid0 = _errs4 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
}
}
if(!valid0){
const err4 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
validate41.errors = vErrors;
return false;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate41.errors = vErrors;
return errors === 0;
}
validate41.evaluated = {"dynamicProps":false,"dynamicItems":false};


function validate44(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate44.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
const _errs2 = errors;
if(errors === _errs2){
if(typeof data == "number"){
if(data > 9007199254740991 || isNaN(data)){
const err0 = {instancePath,schemaPath:"#/$defs/durationMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(data < 0 || isNaN(data)){
const err1 = {instancePath,schemaPath:"#/$defs/durationMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
else {
const err2 = {instancePath,schemaPath:"#/$defs/durationMs/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
}
const _errs4 = errors;
if(data !== null){
const err3 = {instancePath,schemaPath:"#/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
var _valid0 = _errs4 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
}
}
if(!valid0){
const err4 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
validate44.errors = vErrors;
return false;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate44.errors = vErrors;
return errors === 0;
}
validate44.evaluated = {"dynamicProps":false,"dynamicItems":false};

const schema70 = {"type":"object","additionalProperties":false,"required":["status","attempts","succeeded","failed","canceled","pending","unknown"],"properties":{"status":{"$ref":"#/$defs/capabilityState"},"attempts":{"$ref":"#/$defs/nullableCount"},"succeeded":{"$ref":"#/$defs/nullableCount"},"failed":{"$ref":"#/$defs/nullableCount"},"canceled":{"$ref":"#/$defs/nullableCount"},"pending":{"$ref":"#/$defs/nullableCount"},"unknown":{"$ref":"#/$defs/nullableCount"}},"if":{"properties":{"status":{"const":"unavailable"}},"required":["status"]},"then":{"properties":{"attempts":{"type":"null"},"succeeded":{"type":"null"},"failed":{"type":"null"},"canceled":{"type":"null"},"pending":{"type":"null"},"unknown":{"type":"null"}}}};

function validate47(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate47.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs1 = errors;
let valid0 = true;
const _errs2 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.status === undefined) && (missing0 = "status")){
const err0 = {};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(data.status !== undefined){
if("unavailable" !== data.status){
const err1 = {};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
}
var _valid0 = _errs2 === errors;
errors = _errs1;
if(vErrors !== null){
if(_errs1){
vErrors.length = _errs1;
}
else {
vErrors = null;
}
}
if(_valid0){
const _errs4 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.attempts !== undefined){
const _errs5 = errors;
if(data.attempts !== null){
validate47.errors = [{instancePath:instancePath+"/attempts",schemaPath:"#/then/properties/attempts/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
var valid2 = _errs5 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.succeeded !== undefined){
const _errs7 = errors;
if(data.succeeded !== null){
validate47.errors = [{instancePath:instancePath+"/succeeded",schemaPath:"#/then/properties/succeeded/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
var valid2 = _errs7 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.failed !== undefined){
const _errs9 = errors;
if(data.failed !== null){
validate47.errors = [{instancePath:instancePath+"/failed",schemaPath:"#/then/properties/failed/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
var valid2 = _errs9 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.canceled !== undefined){
const _errs11 = errors;
if(data.canceled !== null){
validate47.errors = [{instancePath:instancePath+"/canceled",schemaPath:"#/then/properties/canceled/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
var valid2 = _errs11 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.pending !== undefined){
const _errs13 = errors;
if(data.pending !== null){
validate47.errors = [{instancePath:instancePath+"/pending",schemaPath:"#/then/properties/pending/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
var valid2 = _errs13 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.unknown !== undefined){
const _errs15 = errors;
if(data.unknown !== null){
validate47.errors = [{instancePath:instancePath+"/unknown",schemaPath:"#/then/properties/unknown/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
var valid2 = _errs15 === errors;
}
else {
var valid2 = true;
}
}
}
}
}
}
}
var _valid0 = _errs4 === errors;
valid0 = _valid0;
if(valid0){
var props0 = {};
props0.attempts = true;
props0.succeeded = true;
props0.failed = true;
props0.canceled = true;
props0.pending = true;
props0.unknown = true;
props0.status = true;
}
}
if(!valid0){
const err2 = {instancePath,schemaPath:"#/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
validate47.errors = vErrors;
return false;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing1;
if((((((((data.status === undefined) && (missing1 = "status")) || ((data.attempts === undefined) && (missing1 = "attempts"))) || ((data.succeeded === undefined) && (missing1 = "succeeded"))) || ((data.failed === undefined) && (missing1 = "failed"))) || ((data.canceled === undefined) && (missing1 = "canceled"))) || ((data.pending === undefined) && (missing1 = "pending"))) || ((data.unknown === undefined) && (missing1 = "unknown"))){
validate47.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs17 = errors;
for(const key0 in data){
if(!(((((((key0 === "status") || (key0 === "attempts")) || (key0 === "succeeded")) || (key0 === "failed")) || (key0 === "canceled")) || (key0 === "pending")) || (key0 === "unknown"))){
validate47.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs17 === errors){
if(data.status !== undefined){
let data7 = data.status;
const _errs18 = errors;
if(!(((data7 === "available") || (data7 === "partial")) || (data7 === "unavailable"))){
validate47.errors = [{instancePath:instancePath+"/status",schemaPath:"#/$defs/capabilityState/enum",keyword:"enum",params:{allowedValues: schema59.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid3 = _errs18 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.attempts !== undefined){
const _errs20 = errors;
if(!(validate27(data.attempts, {instancePath:instancePath+"/attempts",parentData:data,parentDataProperty:"attempts",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
errors = vErrors.length;
}
var valid3 = _errs20 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.succeeded !== undefined){
const _errs21 = errors;
if(!(validate27(data.succeeded, {instancePath:instancePath+"/succeeded",parentData:data,parentDataProperty:"succeeded",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
errors = vErrors.length;
}
var valid3 = _errs21 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.failed !== undefined){
const _errs22 = errors;
if(!(validate27(data.failed, {instancePath:instancePath+"/failed",parentData:data,parentDataProperty:"failed",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
errors = vErrors.length;
}
var valid3 = _errs22 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.canceled !== undefined){
const _errs23 = errors;
if(!(validate27(data.canceled, {instancePath:instancePath+"/canceled",parentData:data,parentDataProperty:"canceled",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
errors = vErrors.length;
}
var valid3 = _errs23 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.pending !== undefined){
const _errs24 = errors;
if(!(validate27(data.pending, {instancePath:instancePath+"/pending",parentData:data,parentDataProperty:"pending",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
errors = vErrors.length;
}
var valid3 = _errs24 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.unknown !== undefined){
const _errs25 = errors;
if(!(validate27(data.unknown, {instancePath:instancePath+"/unknown",parentData:data,parentDataProperty:"unknown",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
errors = vErrors.length;
}
var valid3 = _errs25 === errors;
}
else {
var valid3 = true;
}
}
}
}
}
}
}
}
}
}
else {
validate47.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate47.errors = vErrors;
return errors === 0;
}
validate47.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema72 = {"type":"array","items":{"$ref":"#/$defs/impairmentExposure"},"maxItems":5};
const schema73 = {"type":"object","additionalProperties":false,"required":["category","assessedParticipantMs","impairedParticipantMs","unknownParticipantMs"],"properties":{"category":{"$ref":"#/$defs/impairmentCategory"},"assessedParticipantMs":{"$ref":"#/$defs/durationMs"},"impairedParticipantMs":{"$ref":"#/$defs/durationMs"},"unknownParticipantMs":{"$ref":"#/$defs/durationMs"}}};
const schema74 = {"enum":["audio","video","network","connectivity","any"]};

function validate56(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate56.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.category === undefined) && (missing0 = "category")) || ((data.assessedParticipantMs === undefined) && (missing0 = "assessedParticipantMs"))) || ((data.impairedParticipantMs === undefined) && (missing0 = "impairedParticipantMs"))) || ((data.unknownParticipantMs === undefined) && (missing0 = "unknownParticipantMs"))){
validate56.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "category") || (key0 === "assessedParticipantMs")) || (key0 === "impairedParticipantMs")) || (key0 === "unknownParticipantMs"))){
validate56.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.category !== undefined){
let data0 = data.category;
const _errs2 = errors;
if(!(((((data0 === "audio") || (data0 === "video")) || (data0 === "network")) || (data0 === "connectivity")) || (data0 === "any"))){
validate56.errors = [{instancePath:instancePath+"/category",schemaPath:"#/$defs/impairmentCategory/enum",keyword:"enum",params:{allowedValues: schema74.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.assessedParticipantMs !== undefined){
let data1 = data.assessedParticipantMs;
const _errs4 = errors;
const _errs5 = errors;
if(errors === _errs5){
if(typeof data1 == "number"){
if(data1 > 9007199254740991 || isNaN(data1)){
validate56.errors = [{instancePath:instancePath+"/assessedParticipantMs",schemaPath:"#/$defs/durationMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data1 < 0 || isNaN(data1)){
validate56.errors = [{instancePath:instancePath+"/assessedParticipantMs",schemaPath:"#/$defs/durationMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
else {
validate56.errors = [{instancePath:instancePath+"/assessedParticipantMs",schemaPath:"#/$defs/durationMs/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.impairedParticipantMs !== undefined){
let data2 = data.impairedParticipantMs;
const _errs7 = errors;
const _errs8 = errors;
if(errors === _errs8){
if(typeof data2 == "number"){
if(data2 > 9007199254740991 || isNaN(data2)){
validate56.errors = [{instancePath:instancePath+"/impairedParticipantMs",schemaPath:"#/$defs/durationMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data2 < 0 || isNaN(data2)){
validate56.errors = [{instancePath:instancePath+"/impairedParticipantMs",schemaPath:"#/$defs/durationMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
else {
validate56.errors = [{instancePath:instancePath+"/impairedParticipantMs",schemaPath:"#/$defs/durationMs/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.unknownParticipantMs !== undefined){
let data3 = data.unknownParticipantMs;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data3 == "number"){
if(data3 > 9007199254740991 || isNaN(data3)){
validate56.errors = [{instancePath:instancePath+"/unknownParticipantMs",schemaPath:"#/$defs/durationMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data3 < 0 || isNaN(data3)){
validate56.errors = [{instancePath:instancePath+"/unknownParticipantMs",schemaPath:"#/$defs/durationMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
else {
validate56.errors = [{instancePath:instancePath+"/unknownParticipantMs",schemaPath:"#/$defs/durationMs/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate56.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate56.errors = vErrors;
return errors === 0;
}
validate56.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate55(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate55.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(Array.isArray(data)){
if(data.length > 5){
validate55.errors = [{instancePath,schemaPath:"#/maxItems",keyword:"maxItems",params:{limit: 5},message:"must NOT have more than 5 items"}];
return false;
}
else {
var valid0 = true;
const len0 = data.length;
for(let i0=0; i0<len0; i0++){
const _errs1 = errors;
if(!(validate56(data[i0], {instancePath:instancePath+"/" + i0,parentData:data,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
errors = vErrors.length;
}
var valid0 = _errs1 === errors;
if(!valid0){
break;
}
}
}
}
else {
validate55.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
validate55.errors = vErrors;
return errors === 0;
}
validate55.evaluated = {"items":true,"dynamicProps":false,"dynamicItems":false};

const schema78 = {"type":"array","items":{"$ref":"#/$defs/metricAggregate"},"maxItems":512};
const schema79 = {"type":"object","additionalProperties":false,"required":["metricId","status","unavailableReasons","validIntervals","eligibleDurationMs","measuredDurationMs","numerator","denominator","min","max","distribution"],"properties":{"metricId":{"$ref":"#/$defs/metricId"},"status":{"$ref":"#/$defs/metricStatus"},"unavailableReasons":{"$ref":"#/$defs/reasonCodes"},"validIntervals":{"$ref":"#/$defs/count"},"eligibleDurationMs":{"$ref":"#/$defs/nullableDurationMs"},"measuredDurationMs":{"$ref":"#/$defs/durationMs"},"numerator":{"oneOf":[{"$ref":"#/$defs/finiteNumber"},{"type":"null"}]},"denominator":{"oneOf":[{"$ref":"#/$defs/finiteNumber"},{"type":"null"}]},"min":{"oneOf":[{"$ref":"#/$defs/finiteNumber"},{"type":"null"}]},"max":{"oneOf":[{"$ref":"#/$defs/finiteNumber"},{"type":"null"}]},"distribution":{"oneOf":[{"$ref":"#/$defs/histogram"},{"type":"null"}]}},"allOf":[{"if":{"properties":{"status":{"const":"unavailable"}},"required":["status"]},"then":{"properties":{"numerator":{"type":"null"},"denominator":{"type":"null"},"min":{"type":"null"},"max":{"type":"null"},"distribution":{"type":"null"},"validIntervals":{"const":0},"measuredDurationMs":{"const":0},"unavailableReasons":{"minItems":1}}}},{"if":{"properties":{"status":{"const":"measured"}},"required":["status"]},"then":{"properties":{"unavailableReasons":{"maxItems":0}}}}]};
const schema80 = {"type":"string","minLength":1,"maxLength":128,"pattern":"^[a-z][a-zA-Z0-9]*(?:\\.[a-z][a-zA-Z0-9]*)*$"};
const schema81 = {"enum":["measured","partial","unavailable"]};
const schema84 = {"type":"number"};
const func27 = Object.prototype.hasOwnProperty;
const pattern5 = new RegExp("^[a-z][a-zA-Z0-9]*(?:\\.[a-z][a-zA-Z0-9]*)*$", "u");
const schema88 = {"type":"object","additionalProperties":false,"required":["definitionId","weights"],"properties":{"definitionId":{"$ref":"#/$defs/opaqueId"},"weights":{"type":"array","minItems":2,"maxItems":64,"items":{"$ref":"#/$defs/durationMs"}}}};

function validate63(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate63.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.definitionId === undefined) && (missing0 = "definitionId")) || ((data.weights === undefined) && (missing0 = "weights"))){
validate63.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((key0 === "definitionId") || (key0 === "weights"))){
validate63.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.definitionId !== undefined){
let data0 = data.definitionId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 512){
validate63.errors = [{instancePath:instancePath+"/definitionId",schemaPath:"#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data0) < 1){
validate63.errors = [{instancePath:instancePath+"/definitionId",schemaPath:"#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate63.errors = [{instancePath:instancePath+"/definitionId",schemaPath:"#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.weights !== undefined){
let data1 = data.weights;
const _errs5 = errors;
if(errors === _errs5){
if(Array.isArray(data1)){
if(data1.length > 64){
validate63.errors = [{instancePath:instancePath+"/weights",schemaPath:"#/properties/weights/maxItems",keyword:"maxItems",params:{limit: 64},message:"must NOT have more than 64 items"}];
return false;
}
else {
if(data1.length < 2){
validate63.errors = [{instancePath:instancePath+"/weights",schemaPath:"#/properties/weights/minItems",keyword:"minItems",params:{limit: 2},message:"must NOT have fewer than 2 items"}];
return false;
}
else {
var valid2 = true;
const len0 = data1.length;
for(let i0=0; i0<len0; i0++){
let data2 = data1[i0];
const _errs7 = errors;
const _errs8 = errors;
if(errors === _errs8){
if(typeof data2 == "number"){
if(data2 > 9007199254740991 || isNaN(data2)){
validate63.errors = [{instancePath:instancePath+"/weights/" + i0,schemaPath:"#/$defs/durationMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data2 < 0 || isNaN(data2)){
validate63.errors = [{instancePath:instancePath+"/weights/" + i0,schemaPath:"#/$defs/durationMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
else {
validate63.errors = [{instancePath:instancePath+"/weights/" + i0,schemaPath:"#/$defs/durationMs/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid2 = _errs7 === errors;
if(!valid2){
break;
}
}
}
}
}
else {
validate63.errors = [{instancePath:instancePath+"/weights",schemaPath:"#/properties/weights/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
else {
validate63.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate63.errors = vErrors;
return errors === 0;
}
validate63.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate60(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate60.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs1 = errors;
const _errs2 = errors;
let valid1 = true;
const _errs3 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.status === undefined) && (missing0 = "status")){
const err0 = {};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(data.status !== undefined){
if("unavailable" !== data.status){
const err1 = {};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
}
var _valid0 = _errs3 === errors;
errors = _errs2;
if(vErrors !== null){
if(_errs2){
vErrors.length = _errs2;
}
else {
vErrors = null;
}
}
if(_valid0){
const _errs5 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.numerator !== undefined){
const _errs6 = errors;
if(data.numerator !== null){
validate60.errors = [{instancePath:instancePath+"/numerator",schemaPath:"#/allOf/0/then/properties/numerator/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
var valid3 = _errs6 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.denominator !== undefined){
const _errs8 = errors;
if(data.denominator !== null){
validate60.errors = [{instancePath:instancePath+"/denominator",schemaPath:"#/allOf/0/then/properties/denominator/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
var valid3 = _errs8 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.min !== undefined){
const _errs10 = errors;
if(data.min !== null){
validate60.errors = [{instancePath:instancePath+"/min",schemaPath:"#/allOf/0/then/properties/min/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
var valid3 = _errs10 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.max !== undefined){
const _errs12 = errors;
if(data.max !== null){
validate60.errors = [{instancePath:instancePath+"/max",schemaPath:"#/allOf/0/then/properties/max/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
var valid3 = _errs12 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.distribution !== undefined){
const _errs14 = errors;
if(data.distribution !== null){
validate60.errors = [{instancePath:instancePath+"/distribution",schemaPath:"#/allOf/0/then/properties/distribution/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
var valid3 = _errs14 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.validIntervals !== undefined){
const _errs16 = errors;
if(0 !== data.validIntervals){
validate60.errors = [{instancePath:instancePath+"/validIntervals",schemaPath:"#/allOf/0/then/properties/validIntervals/const",keyword:"const",params:{allowedValue: 0},message:"must be equal to constant"}];
return false;
}
var valid3 = _errs16 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.measuredDurationMs !== undefined){
const _errs17 = errors;
if(0 !== data.measuredDurationMs){
validate60.errors = [{instancePath:instancePath+"/measuredDurationMs",schemaPath:"#/allOf/0/then/properties/measuredDurationMs/const",keyword:"const",params:{allowedValue: 0},message:"must be equal to constant"}];
return false;
}
var valid3 = _errs17 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.unavailableReasons !== undefined){
let data8 = data.unavailableReasons;
const _errs18 = errors;
if(Array.isArray(data8)){
if(data8.length < 1){
validate60.errors = [{instancePath:instancePath+"/unavailableReasons",schemaPath:"#/allOf/0/then/properties/unavailableReasons/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"}];
return false;
}
}
var valid3 = _errs18 === errors;
}
else {
var valid3 = true;
}
}
}
}
}
}
}
}
}
var _valid0 = _errs5 === errors;
valid1 = _valid0;
if(valid1){
var props0 = {};
props0.numerator = true;
props0.denominator = true;
props0.min = true;
props0.max = true;
props0.distribution = true;
props0.validIntervals = true;
props0.measuredDurationMs = true;
props0.unavailableReasons = true;
props0.status = true;
}
}
if(!valid1){
const err2 = {instancePath,schemaPath:"#/allOf/0/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
validate60.errors = vErrors;
return false;
}
var valid0 = _errs1 === errors;
if(valid0){
const _errs19 = errors;
const _errs20 = errors;
let valid4 = true;
const _errs21 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing1;
if((data.status === undefined) && (missing1 = "status")){
const err3 = {};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
else {
if(data.status !== undefined){
if("measured" !== data.status){
const err4 = {};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
}
}
var _valid1 = _errs21 === errors;
errors = _errs20;
if(vErrors !== null){
if(_errs20){
vErrors.length = _errs20;
}
else {
vErrors = null;
}
}
if(_valid1){
const _errs23 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.unavailableReasons !== undefined){
let data10 = data.unavailableReasons;
if(Array.isArray(data10)){
if(data10.length > 0){
validate60.errors = [{instancePath:instancePath+"/unavailableReasons",schemaPath:"#/allOf/1/then/properties/unavailableReasons/maxItems",keyword:"maxItems",params:{limit: 0},message:"must NOT have more than 0 items"}];
return false;
}
}
}
}
var _valid1 = _errs23 === errors;
valid4 = _valid1;
if(valid4){
var props1 = {};
props1.unavailableReasons = true;
props1.status = true;
}
}
if(!valid4){
const err5 = {instancePath,schemaPath:"#/allOf/1/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
validate60.errors = vErrors;
return false;
}
var valid0 = _errs19 === errors;
if(valid0){
if(props0 !== true && props1 !== undefined){
if(props1 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props1);
}
}
}
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing2;
if((((((((((((data.metricId === undefined) && (missing2 = "metricId")) || ((data.status === undefined) && (missing2 = "status"))) || ((data.unavailableReasons === undefined) && (missing2 = "unavailableReasons"))) || ((data.validIntervals === undefined) && (missing2 = "validIntervals"))) || ((data.eligibleDurationMs === undefined) && (missing2 = "eligibleDurationMs"))) || ((data.measuredDurationMs === undefined) && (missing2 = "measuredDurationMs"))) || ((data.numerator === undefined) && (missing2 = "numerator"))) || ((data.denominator === undefined) && (missing2 = "denominator"))) || ((data.min === undefined) && (missing2 = "min"))) || ((data.max === undefined) && (missing2 = "max"))) || ((data.distribution === undefined) && (missing2 = "distribution"))){
validate60.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing2},message:"must have required property '"+missing2+"'"}];
return false;
}
else {
const _errs25 = errors;
for(const key0 in data){
if(!(func27.call(schema79.properties, key0))){
validate60.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs25 === errors){
if(data.metricId !== undefined){
let data11 = data.metricId;
const _errs26 = errors;
const _errs27 = errors;
if(errors === _errs27){
if(typeof data11 === "string"){
if(func1(data11) > 128){
validate60.errors = [{instancePath:instancePath+"/metricId",schemaPath:"#/$defs/metricId/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"}];
return false;
}
else {
if(func1(data11) < 1){
validate60.errors = [{instancePath:instancePath+"/metricId",schemaPath:"#/$defs/metricId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
else {
if(!pattern5.test(data11)){
validate60.errors = [{instancePath:instancePath+"/metricId",schemaPath:"#/$defs/metricId/pattern",keyword:"pattern",params:{pattern: "^[a-z][a-zA-Z0-9]*(?:\\.[a-z][a-zA-Z0-9]*)*$"},message:"must match pattern \""+"^[a-z][a-zA-Z0-9]*(?:\\.[a-z][a-zA-Z0-9]*)*$"+"\""}];
return false;
}
}
}
}
else {
validate60.errors = [{instancePath:instancePath+"/metricId",schemaPath:"#/$defs/metricId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid7 = _errs26 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.status !== undefined){
let data12 = data.status;
const _errs29 = errors;
if(!(((data12 === "measured") || (data12 === "partial")) || (data12 === "unavailable"))){
validate60.errors = [{instancePath:instancePath+"/status",schemaPath:"#/$defs/metricStatus/enum",keyword:"enum",params:{allowedValues: schema81.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid7 = _errs29 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.unavailableReasons !== undefined){
const _errs31 = errors;
if(!(validate31(data.unavailableReasons, {instancePath:instancePath+"/unavailableReasons",parentData:data,parentDataProperty:"unavailableReasons",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate31.errors : vErrors.concat(validate31.errors);
errors = vErrors.length;
}
var valid7 = _errs31 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.validIntervals !== undefined){
let data14 = data.validIntervals;
const _errs32 = errors;
const _errs33 = errors;
if(!((typeof data14 == "number") && (!(data14 % 1) && !isNaN(data14)))){
validate60.errors = [{instancePath:instancePath+"/validIntervals",schemaPath:"#/$defs/count/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs33){
if(typeof data14 == "number"){
if(data14 > 9007199254740991 || isNaN(data14)){
validate60.errors = [{instancePath:instancePath+"/validIntervals",schemaPath:"#/$defs/count/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data14 < 0 || isNaN(data14)){
validate60.errors = [{instancePath:instancePath+"/validIntervals",schemaPath:"#/$defs/count/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid7 = _errs32 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.eligibleDurationMs !== undefined){
const _errs35 = errors;
if(!(validate29(data.eligibleDurationMs, {instancePath:instancePath+"/eligibleDurationMs",parentData:data,parentDataProperty:"eligibleDurationMs",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate29.errors : vErrors.concat(validate29.errors);
errors = vErrors.length;
}
var valid7 = _errs35 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.measuredDurationMs !== undefined){
let data16 = data.measuredDurationMs;
const _errs36 = errors;
const _errs37 = errors;
if(errors === _errs37){
if(typeof data16 == "number"){
if(data16 > 9007199254740991 || isNaN(data16)){
validate60.errors = [{instancePath:instancePath+"/measuredDurationMs",schemaPath:"#/$defs/durationMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data16 < 0 || isNaN(data16)){
validate60.errors = [{instancePath:instancePath+"/measuredDurationMs",schemaPath:"#/$defs/durationMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
else {
validate60.errors = [{instancePath:instancePath+"/measuredDurationMs",schemaPath:"#/$defs/durationMs/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid7 = _errs36 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.numerator !== undefined){
let data17 = data.numerator;
const _errs39 = errors;
const _errs40 = errors;
let valid12 = false;
let passing0 = null;
const _errs41 = errors;
if(!(typeof data17 == "number")){
const err6 = {instancePath:instancePath+"/numerator",schemaPath:"#/$defs/finiteNumber/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
var _valid2 = _errs41 === errors;
if(_valid2){
valid12 = true;
passing0 = 0;
}
const _errs44 = errors;
if(data17 !== null){
const err7 = {instancePath:instancePath+"/numerator",schemaPath:"#/properties/numerator/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
var _valid2 = _errs44 === errors;
if(_valid2 && valid12){
valid12 = false;
passing0 = [passing0, 1];
}
else {
if(_valid2){
valid12 = true;
passing0 = 1;
}
}
if(!valid12){
const err8 = {instancePath:instancePath+"/numerator",schemaPath:"#/properties/numerator/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
validate60.errors = vErrors;
return false;
}
else {
errors = _errs40;
if(vErrors !== null){
if(_errs40){
vErrors.length = _errs40;
}
else {
vErrors = null;
}
}
}
var valid7 = _errs39 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.denominator !== undefined){
let data18 = data.denominator;
const _errs46 = errors;
const _errs47 = errors;
let valid14 = false;
let passing1 = null;
const _errs48 = errors;
if(!(typeof data18 == "number")){
const err9 = {instancePath:instancePath+"/denominator",schemaPath:"#/$defs/finiteNumber/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
var _valid3 = _errs48 === errors;
if(_valid3){
valid14 = true;
passing1 = 0;
}
const _errs51 = errors;
if(data18 !== null){
const err10 = {instancePath:instancePath+"/denominator",schemaPath:"#/properties/denominator/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
var _valid3 = _errs51 === errors;
if(_valid3 && valid14){
valid14 = false;
passing1 = [passing1, 1];
}
else {
if(_valid3){
valid14 = true;
passing1 = 1;
}
}
if(!valid14){
const err11 = {instancePath:instancePath+"/denominator",schemaPath:"#/properties/denominator/oneOf",keyword:"oneOf",params:{passingSchemas: passing1},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
validate60.errors = vErrors;
return false;
}
else {
errors = _errs47;
if(vErrors !== null){
if(_errs47){
vErrors.length = _errs47;
}
else {
vErrors = null;
}
}
}
var valid7 = _errs46 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.min !== undefined){
let data19 = data.min;
const _errs53 = errors;
const _errs54 = errors;
let valid16 = false;
let passing2 = null;
const _errs55 = errors;
if(!(typeof data19 == "number")){
const err12 = {instancePath:instancePath+"/min",schemaPath:"#/$defs/finiteNumber/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
var _valid4 = _errs55 === errors;
if(_valid4){
valid16 = true;
passing2 = 0;
}
const _errs58 = errors;
if(data19 !== null){
const err13 = {instancePath:instancePath+"/min",schemaPath:"#/properties/min/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
var _valid4 = _errs58 === errors;
if(_valid4 && valid16){
valid16 = false;
passing2 = [passing2, 1];
}
else {
if(_valid4){
valid16 = true;
passing2 = 1;
}
}
if(!valid16){
const err14 = {instancePath:instancePath+"/min",schemaPath:"#/properties/min/oneOf",keyword:"oneOf",params:{passingSchemas: passing2},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
validate60.errors = vErrors;
return false;
}
else {
errors = _errs54;
if(vErrors !== null){
if(_errs54){
vErrors.length = _errs54;
}
else {
vErrors = null;
}
}
}
var valid7 = _errs53 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.max !== undefined){
let data20 = data.max;
const _errs60 = errors;
const _errs61 = errors;
let valid18 = false;
let passing3 = null;
const _errs62 = errors;
if(!(typeof data20 == "number")){
const err15 = {instancePath:instancePath+"/max",schemaPath:"#/$defs/finiteNumber/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
var _valid5 = _errs62 === errors;
if(_valid5){
valid18 = true;
passing3 = 0;
}
const _errs65 = errors;
if(data20 !== null){
const err16 = {instancePath:instancePath+"/max",schemaPath:"#/properties/max/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
var _valid5 = _errs65 === errors;
if(_valid5 && valid18){
valid18 = false;
passing3 = [passing3, 1];
}
else {
if(_valid5){
valid18 = true;
passing3 = 1;
}
}
if(!valid18){
const err17 = {instancePath:instancePath+"/max",schemaPath:"#/properties/max/oneOf",keyword:"oneOf",params:{passingSchemas: passing3},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
validate60.errors = vErrors;
return false;
}
else {
errors = _errs61;
if(vErrors !== null){
if(_errs61){
vErrors.length = _errs61;
}
else {
vErrors = null;
}
}
}
var valid7 = _errs60 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.distribution !== undefined){
let data21 = data.distribution;
const _errs67 = errors;
const _errs68 = errors;
let valid20 = false;
let passing4 = null;
const _errs69 = errors;
if(!(validate63(data21, {instancePath:instancePath+"/distribution",parentData:data,parentDataProperty:"distribution",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate63.errors : vErrors.concat(validate63.errors);
errors = vErrors.length;
}
var _valid6 = _errs69 === errors;
if(_valid6){
valid20 = true;
passing4 = 0;
}
const _errs70 = errors;
if(data21 !== null){
const err18 = {instancePath:instancePath+"/distribution",schemaPath:"#/properties/distribution/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
var _valid6 = _errs70 === errors;
if(_valid6 && valid20){
valid20 = false;
passing4 = [passing4, 1];
}
else {
if(_valid6){
valid20 = true;
passing4 = 1;
}
}
if(!valid20){
const err19 = {instancePath:instancePath+"/distribution",schemaPath:"#/properties/distribution/oneOf",keyword:"oneOf",params:{passingSchemas: passing4},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
validate60.errors = vErrors;
return false;
}
else {
errors = _errs68;
if(vErrors !== null){
if(_errs68){
vErrors.length = _errs68;
}
else {
vErrors = null;
}
}
}
var valid7 = _errs67 === errors;
}
else {
var valid7 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate60.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate60.errors = vErrors;
return errors === 0;
}
validate60.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate59(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate59.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(Array.isArray(data)){
if(data.length > 512){
validate59.errors = [{instancePath,schemaPath:"#/maxItems",keyword:"maxItems",params:{limit: 512},message:"must NOT have more than 512 items"}];
return false;
}
else {
var valid0 = true;
const len0 = data.length;
for(let i0=0; i0<len0; i0++){
const _errs1 = errors;
if(!(validate60(data[i0], {instancePath:instancePath+"/" + i0,parentData:data,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate60.errors : vErrors.concat(validate60.errors);
errors = vErrors.length;
}
var valid0 = _errs1 === errors;
if(!valid0){
break;
}
}
}
}
else {
validate59.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
validate59.errors = vErrors;
return errors === 0;
}
validate59.evaluated = {"items":true,"dynamicProps":false,"dynamicItems":false};

const schema91 = {"type":"array","items":{"$ref":"#/$defs/findingCount"},"maxItems":128};
const schema92 = {"type":"object","additionalProperties":false,"required":["category","raised","activeAtEnd","truncated"],"properties":{"category":{"$ref":"#/$defs/findingCategory"},"raised":{"$ref":"#/$defs/count"},"activeAtEnd":{"$ref":"#/$defs/count"},"truncated":{"type":"boolean"}}};
const schema93 = {"type":"string","minLength":1,"maxLength":128};

function validate68(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate68.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.category === undefined) && (missing0 = "category")) || ((data.raised === undefined) && (missing0 = "raised"))) || ((data.activeAtEnd === undefined) && (missing0 = "activeAtEnd"))) || ((data.truncated === undefined) && (missing0 = "truncated"))){
validate68.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "category") || (key0 === "raised")) || (key0 === "activeAtEnd")) || (key0 === "truncated"))){
validate68.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.category !== undefined){
let data0 = data.category;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 128){
validate68.errors = [{instancePath:instancePath+"/category",schemaPath:"#/$defs/findingCategory/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"}];
return false;
}
else {
if(func1(data0) < 1){
validate68.errors = [{instancePath:instancePath+"/category",schemaPath:"#/$defs/findingCategory/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate68.errors = [{instancePath:instancePath+"/category",schemaPath:"#/$defs/findingCategory/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.raised !== undefined){
let data1 = data.raised;
const _errs5 = errors;
const _errs6 = errors;
if(!((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1)))){
validate68.errors = [{instancePath:instancePath+"/raised",schemaPath:"#/$defs/count/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs6){
if(typeof data1 == "number"){
if(data1 > 9007199254740991 || isNaN(data1)){
validate68.errors = [{instancePath:instancePath+"/raised",schemaPath:"#/$defs/count/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data1 < 0 || isNaN(data1)){
validate68.errors = [{instancePath:instancePath+"/raised",schemaPath:"#/$defs/count/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.activeAtEnd !== undefined){
let data2 = data.activeAtEnd;
const _errs8 = errors;
const _errs9 = errors;
if(!((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2)))){
validate68.errors = [{instancePath:instancePath+"/activeAtEnd",schemaPath:"#/$defs/count/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs9){
if(typeof data2 == "number"){
if(data2 > 9007199254740991 || isNaN(data2)){
validate68.errors = [{instancePath:instancePath+"/activeAtEnd",schemaPath:"#/$defs/count/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data2 < 0 || isNaN(data2)){
validate68.errors = [{instancePath:instancePath+"/activeAtEnd",schemaPath:"#/$defs/count/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.truncated !== undefined){
const _errs11 = errors;
if(typeof data.truncated !== "boolean"){
validate68.errors = [{instancePath:instancePath+"/truncated",schemaPath:"#/properties/truncated/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate68.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate68.errors = vErrors;
return errors === 0;
}
validate68.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate67(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate67.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(Array.isArray(data)){
if(data.length > 128){
validate67.errors = [{instancePath,schemaPath:"#/maxItems",keyword:"maxItems",params:{limit: 128},message:"must NOT have more than 128 items"}];
return false;
}
else {
var valid0 = true;
const len0 = data.length;
for(let i0=0; i0<len0; i0++){
const _errs1 = errors;
if(!(validate68(data[i0], {instancePath:instancePath+"/" + i0,parentData:data,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate68.errors : vErrors.concat(validate68.errors);
errors = vErrors.length;
}
var valid0 = _errs1 === errors;
if(!valid0){
break;
}
}
}
}
else {
validate67.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
validate67.errors = vErrors;
return errors === 0;
}
validate67.evaluated = {"items":true,"dynamicProps":false,"dynamicItems":false};

const schema96 = {"oneOf":[{"$ref":"#/$defs/resourceRef"},{"type":"null"}]};
const schema97 = {"type":"object","additionalProperties":false,"required":["resourceId","records"],"properties":{"resourceId":{"$ref":"#/$defs/opaqueId"},"records":{"$ref":"#/$defs/count"}}};

function validate72(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate72.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.resourceId === undefined) && (missing0 = "resourceId")) || ((data.records === undefined) && (missing0 = "records"))){
validate72.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((key0 === "resourceId") || (key0 === "records"))){
validate72.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.resourceId !== undefined){
let data0 = data.resourceId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 512){
validate72.errors = [{instancePath:instancePath+"/resourceId",schemaPath:"#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data0) < 1){
validate72.errors = [{instancePath:instancePath+"/resourceId",schemaPath:"#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate72.errors = [{instancePath:instancePath+"/resourceId",schemaPath:"#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.records !== undefined){
let data1 = data.records;
const _errs5 = errors;
const _errs6 = errors;
if(!((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1)))){
validate72.errors = [{instancePath:instancePath+"/records",schemaPath:"#/$defs/count/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs6){
if(typeof data1 == "number"){
if(data1 > 9007199254740991 || isNaN(data1)){
validate72.errors = [{instancePath:instancePath+"/records",schemaPath:"#/$defs/count/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data1 < 0 || isNaN(data1)){
validate72.errors = [{instancePath:instancePath+"/records",schemaPath:"#/$defs/count/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
else {
validate72.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate72.errors = vErrors;
return errors === 0;
}
validate72.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate71(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate71.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(!(validate72(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate72.errors : vErrors.concat(validate72.errors);
errors = vErrors.length;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = true;
}
const _errs2 = errors;
if(data !== null){
const err0 = {instancePath,schemaPath:"#/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
var _valid0 = _errs2 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
}
}
if(!valid0){
const err1 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
validate71.errors = vErrors;
return false;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate71.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate71.evaluated = {"dynamicProps":true,"dynamicItems":false};


function validate20(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="https://schemas.observertc.org/digest/v1/call-digest.json" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate20.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((((((((((((((((((data.kind === undefined) && (missing0 = "kind")) || ((data.schemaVersion === undefined) && (missing0 = "schemaVersion"))) || ((data.digestId === undefined) && (missing0 = "digestId"))) || ((data.tenantId === undefined) && (missing0 = "tenantId"))) || ((data.callId === undefined) && (missing0 = "callId"))) || ((data.roomId === undefined) && (missing0 = "roomId"))) || ((data.revision === undefined) && (missing0 = "revision"))) || ((data.provenance === undefined) && (missing0 = "provenance"))) || ((data.lifecycle === undefined) && (missing0 = "lifecycle"))) || ((data.range === undefined) && (missing0 = "range"))) || ((data.coverage === undefined) && (missing0 = "coverage"))) || ((data.capabilities === undefined) && (missing0 = "capabilities"))) || ((data.sources === undefined) && (missing0 = "sources"))) || ((data.usage === undefined) && (missing0 = "usage"))) || ((data.joins === undefined) && (missing0 = "joins"))) || ((data.impairments === undefined) && (missing0 = "impairments"))) || ((data.metrics === undefined) && (missing0 = "metrics"))) || ((data.findingCounts === undefined) && (missing0 = "findingCounts"))) || ((data.participants === undefined) && (missing0 = "participants"))) || ((data.streamDetails === undefined) && (missing0 = "streamDetails"))) || ((data.pathDetails === undefined) && (missing0 = "pathDetails"))) || ((data.timeline === undefined) && (missing0 = "timeline"))) || ((data.findings === undefined) && (missing0 = "findings"))){
validate20.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.kind !== undefined){
const _errs2 = errors;
if("call-digest" !== data.kind){
validate20.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "call-digest"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.schemaVersion !== undefined){
const _errs3 = errors;
if(1 !== data.schemaVersion){
validate20.errors = [{instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.digestId !== undefined){
let data2 = data.digestId;
const _errs4 = errors;
const _errs5 = errors;
if(errors === _errs5){
if(typeof data2 === "string"){
if(func1(data2) > 512){
validate20.errors = [{instancePath:instancePath+"/digestId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data2) < 1){
validate20.errors = [{instancePath:instancePath+"/digestId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate20.errors = [{instancePath:instancePath+"/digestId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.tenantId !== undefined){
let data3 = data.tenantId;
const _errs7 = errors;
const _errs8 = errors;
if(errors === _errs8){
if(typeof data3 === "string"){
if(func1(data3) > 512){
validate20.errors = [{instancePath:instancePath+"/tenantId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data3) < 1){
validate20.errors = [{instancePath:instancePath+"/tenantId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate20.errors = [{instancePath:instancePath+"/tenantId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.callId !== undefined){
let data4 = data.callId;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data4 === "string"){
if(func1(data4) > 512){
validate20.errors = [{instancePath:instancePath+"/callId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data4) < 1){
validate20.errors = [{instancePath:instancePath+"/callId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate20.errors = [{instancePath:instancePath+"/callId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.roomId !== undefined){
let data5 = data.roomId;
const _errs13 = errors;
const _errs14 = errors;
let valid4 = false;
let passing0 = null;
const _errs15 = errors;
const _errs16 = errors;
if(errors === _errs16){
if(typeof data5 === "string"){
if(func1(data5) > 512){
const err0 = {instancePath:instancePath+"/roomId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(func1(data5) < 1){
const err1 = {instancePath:instancePath+"/roomId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
else {
const err2 = {instancePath:instancePath+"/roomId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
var _valid0 = _errs15 === errors;
if(_valid0){
valid4 = true;
passing0 = 0;
}
const _errs18 = errors;
if(data5 !== null){
const err3 = {instancePath:instancePath+"/roomId",schemaPath:"#/properties/roomId/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
var _valid0 = _errs18 === errors;
if(_valid0 && valid4){
valid4 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid4 = true;
passing0 = 1;
}
}
if(!valid4){
const err4 = {instancePath:instancePath+"/roomId",schemaPath:"#/properties/roomId/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
validate20.errors = vErrors;
return false;
}
else {
errors = _errs14;
if(vErrors !== null){
if(_errs14){
vErrors.length = _errs14;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.revision !== undefined){
let data6 = data.revision;
const _errs20 = errors;
const _errs21 = errors;
if(errors === _errs21){
if(typeof data6 === "string"){
if(func1(data6) > 512){
validate20.errors = [{instancePath:instancePath+"/revision",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data6) < 1){
validate20.errors = [{instancePath:instancePath+"/revision",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate20.errors = [{instancePath:instancePath+"/revision",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs20 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.provenance !== undefined){
const _errs23 = errors;
if(!(validate22(data.provenance, {instancePath:instancePath+"/provenance",parentData:data,parentDataProperty:"provenance",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate22.errors : vErrors.concat(validate22.errors);
errors = vErrors.length;
}
var valid0 = _errs23 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.lifecycle !== undefined){
let data8 = data.lifecycle;
const _errs24 = errors;
if(!(((data8 === "open") || (data8 === "closed")) || (data8 === "unknown"))){
validate20.errors = [{instancePath:instancePath+"/lifecycle",schemaPath:"#/properties/lifecycle/enum",keyword:"enum",params:{allowedValues: schema31.properties.lifecycle.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs24 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.range !== undefined){
let data9 = data.range;
const _errs25 = errors;
const _errs26 = errors;
let valid7 = false;
let passing1 = null;
const _errs27 = errors;
if(!(validate24(data9, {instancePath:instancePath+"/range",parentData:data,parentDataProperty:"range",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate24.errors : vErrors.concat(validate24.errors);
errors = vErrors.length;
}
var _valid1 = _errs27 === errors;
if(_valid1){
valid7 = true;
passing1 = 0;
}
const _errs28 = errors;
if(data9 !== null){
const err5 = {instancePath:instancePath+"/range",schemaPath:"#/properties/range/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
var _valid1 = _errs28 === errors;
if(_valid1 && valid7){
valid7 = false;
passing1 = [passing1, 1];
}
else {
if(_valid1){
valid7 = true;
passing1 = 1;
}
}
if(!valid7){
const err6 = {instancePath:instancePath+"/range",schemaPath:"#/properties/range/oneOf",keyword:"oneOf",params:{passingSchemas: passing1},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
validate20.errors = vErrors;
return false;
}
else {
errors = _errs26;
if(vErrors !== null){
if(_errs26){
vErrors.length = _errs26;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs25 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.coverage !== undefined){
const _errs30 = errors;
if(!(validate26(data.coverage, {instancePath:instancePath+"/coverage",parentData:data,parentDataProperty:"coverage",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate26.errors : vErrors.concat(validate26.errors);
errors = vErrors.length;
}
var valid0 = _errs30 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.capabilities !== undefined){
const _errs31 = errors;
if(!(validate34(data.capabilities, {instancePath:instancePath+"/capabilities",parentData:data,parentDataProperty:"capabilities",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate34.errors : vErrors.concat(validate34.errors);
errors = vErrors.length;
}
var valid0 = _errs31 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sources !== undefined){
let data12 = data.sources;
const _errs32 = errors;
if(errors === _errs32){
if(Array.isArray(data12)){
if(data12.length > 4096){
validate20.errors = [{instancePath:instancePath+"/sources",schemaPath:"#/properties/sources/maxItems",keyword:"maxItems",params:{limit: 4096},message:"must NOT have more than 4096 items"}];
return false;
}
else {
var valid8 = true;
const len0 = data12.length;
for(let i0=0; i0<len0; i0++){
const _errs34 = errors;
if(!(validate39(data12[i0], {instancePath:instancePath+"/sources/" + i0,parentData:data12,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate39.errors : vErrors.concat(validate39.errors);
errors = vErrors.length;
}
var valid8 = _errs34 === errors;
if(!valid8){
break;
}
}
}
}
else {
validate20.errors = [{instancePath:instancePath+"/sources",schemaPath:"#/properties/sources/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs32 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.usage !== undefined){
let data14 = data.usage;
const _errs35 = errors;
if(errors === _errs35){
if(data14 && typeof data14 == "object" && !Array.isArray(data14)){
let missing1;
if((((((data14.participantSessions === undefined) && (missing1 = "participantSessions")) || ((data14.peakConcurrentParticipants === undefined) && (missing1 = "peakConcurrentParticipants"))) || ((data14.observedParticipantMs === undefined) && (missing1 = "observedParticipantMs"))) || ((data14.connectedParticipantMs === undefined) && (missing1 = "connectedParticipantMs"))) || ((data14.callDurationMs === undefined) && (missing1 = "callDurationMs"))){
validate20.errors = [{instancePath:instancePath+"/usage",schemaPath:"#/properties/usage/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs37 = errors;
for(const key0 in data14){
if(!(((((key0 === "participantSessions") || (key0 === "peakConcurrentParticipants")) || (key0 === "observedParticipantMs")) || (key0 === "connectedParticipantMs")) || (key0 === "callDurationMs"))){
validate20.errors = [{instancePath:instancePath+"/usage",schemaPath:"#/properties/usage/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs37 === errors){
if(data14.participantSessions !== undefined){
const _errs38 = errors;
if(!(validate41(data14.participantSessions, {instancePath:instancePath+"/usage/participantSessions",parentData:data14,parentDataProperty:"participantSessions",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate41.errors : vErrors.concat(validate41.errors);
errors = vErrors.length;
}
var valid9 = _errs38 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data14.peakConcurrentParticipants !== undefined){
const _errs39 = errors;
if(!(validate41(data14.peakConcurrentParticipants, {instancePath:instancePath+"/usage/peakConcurrentParticipants",parentData:data14,parentDataProperty:"peakConcurrentParticipants",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate41.errors : vErrors.concat(validate41.errors);
errors = vErrors.length;
}
var valid9 = _errs39 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data14.observedParticipantMs !== undefined){
let data17 = data14.observedParticipantMs;
const _errs40 = errors;
const _errs41 = errors;
if(errors === _errs41){
if(typeof data17 == "number"){
if(data17 > 9007199254740991 || isNaN(data17)){
validate20.errors = [{instancePath:instancePath+"/usage/observedParticipantMs",schemaPath:"common.json#/$defs/durationMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data17 < 0 || isNaN(data17)){
validate20.errors = [{instancePath:instancePath+"/usage/observedParticipantMs",schemaPath:"common.json#/$defs/durationMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
else {
validate20.errors = [{instancePath:instancePath+"/usage/observedParticipantMs",schemaPath:"common.json#/$defs/durationMs/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid9 = _errs40 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data14.connectedParticipantMs !== undefined){
const _errs43 = errors;
if(!(validate44(data14.connectedParticipantMs, {instancePath:instancePath+"/usage/connectedParticipantMs",parentData:data14,parentDataProperty:"connectedParticipantMs",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate44.errors : vErrors.concat(validate44.errors);
errors = vErrors.length;
}
var valid9 = _errs43 === errors;
}
else {
var valid9 = true;
}
if(valid9){
if(data14.callDurationMs !== undefined){
const _errs44 = errors;
if(!(validate44(data14.callDurationMs, {instancePath:instancePath+"/usage/callDurationMs",parentData:data14,parentDataProperty:"callDurationMs",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate44.errors : vErrors.concat(validate44.errors);
errors = vErrors.length;
}
var valid9 = _errs44 === errors;
}
else {
var valid9 = true;
}
}
}
}
}
}
}
}
else {
validate20.errors = [{instancePath:instancePath+"/usage",schemaPath:"#/properties/usage/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs35 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.joins !== undefined){
const _errs45 = errors;
if(!(validate47(data.joins, {instancePath:instancePath+"/joins",parentData:data,parentDataProperty:"joins",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate47.errors : vErrors.concat(validate47.errors);
errors = vErrors.length;
}
var valid0 = _errs45 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.impairments !== undefined){
const _errs46 = errors;
if(!(validate55(data.impairments, {instancePath:instancePath+"/impairments",parentData:data,parentDataProperty:"impairments",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate55.errors : vErrors.concat(validate55.errors);
errors = vErrors.length;
}
var valid0 = _errs46 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.metrics !== undefined){
const _errs47 = errors;
if(!(validate59(data.metrics, {instancePath:instancePath+"/metrics",parentData:data,parentDataProperty:"metrics",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate59.errors : vErrors.concat(validate59.errors);
errors = vErrors.length;
}
var valid0 = _errs47 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.findingCounts !== undefined){
const _errs48 = errors;
if(!(validate67(data.findingCounts, {instancePath:instancePath+"/findingCounts",parentData:data,parentDataProperty:"findingCounts",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate67.errors : vErrors.concat(validate67.errors);
errors = vErrors.length;
}
var valid0 = _errs48 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.participants !== undefined){
const _errs49 = errors;
if(!(validate71(data.participants, {instancePath:instancePath+"/participants",parentData:data,parentDataProperty:"participants",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate71.errors : vErrors.concat(validate71.errors);
errors = vErrors.length;
}
var valid0 = _errs49 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.streamDetails !== undefined){
const _errs50 = errors;
if(!(validate71(data.streamDetails, {instancePath:instancePath+"/streamDetails",parentData:data,parentDataProperty:"streamDetails",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate71.errors : vErrors.concat(validate71.errors);
errors = vErrors.length;
}
var valid0 = _errs50 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.pathDetails !== undefined){
const _errs51 = errors;
if(!(validate71(data.pathDetails, {instancePath:instancePath+"/pathDetails",parentData:data,parentDataProperty:"pathDetails",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate71.errors : vErrors.concat(validate71.errors);
errors = vErrors.length;
}
var valid0 = _errs51 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.timeline !== undefined){
const _errs52 = errors;
if(!(validate71(data.timeline, {instancePath:instancePath+"/timeline",parentData:data,parentDataProperty:"timeline",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate71.errors : vErrors.concat(validate71.errors);
errors = vErrors.length;
}
var valid0 = _errs52 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.findings !== undefined){
const _errs53 = errors;
if(!(validate71(data.findings, {instancePath:instancePath+"/findings",parentData:data,parentDataProperty:"findings",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate71.errors : vErrors.concat(validate71.errors);
errors = vErrors.length;
}
var valid0 = _errs53 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate20.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate20.errors = vErrors;
return errors === 0;
}
validate20.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const validatePeriodDigest = validate79;
const schema100 = {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://schemas.observertc.org/digest/v1/period-digest.json","type":"object","additionalProperties":true,"required":["kind","schemaVersion","tenantId","period","id","range","revision","provenance","completeness","coverage","totals","joins","impairments","metrics","findingCounts","cohorts","buckets","worstCalls","callSearchResourceId"],"properties":{"kind":{"const":"period-digest"},"schemaVersion":{"const":1},"tenantId":{"$ref":"common.json#/$defs/opaqueId"},"period":{"enum":["day","month"]},"id":{"type":"string","minLength":7,"maxLength":10},"range":{"$ref":"common.json#/$defs/timeRange"},"revision":{"$ref":"common.json#/$defs/opaqueId"},"provenance":{"$ref":"common.json#/$defs/provenance"},"completeness":{"$ref":"common.json#/$defs/completeness"},"coverage":{"type":"object","additionalProperties":false,"required":["indexedCalls","readableCallDigests","pendingCallDigests","failedCallDigests","unknownCallDigests","expectedChildPeriods","includedChildPeriods"],"properties":{"indexedCalls":{"$ref":"common.json#/$defs/count"},"readableCallDigests":{"$ref":"common.json#/$defs/count"},"pendingCallDigests":{"$ref":"common.json#/$defs/count"},"failedCallDigests":{"$ref":"common.json#/$defs/count"},"unknownCallDigests":{"$ref":"common.json#/$defs/count"},"expectedChildPeriods":{"$ref":"common.json#/$defs/count"},"includedChildPeriods":{"$ref":"common.json#/$defs/count"}}},"totals":{"type":"object","additionalProperties":false,"required":["callsStarted","callsWithExposure","participantSessionsStarted","observedParticipantMs","connectedParticipantMs","callExposureMs","largestCallPeakParticipants"],"properties":{"callsStarted":{"$ref":"common.json#/$defs/count"},"callsWithExposure":{"$ref":"common.json#/$defs/count"},"participantSessionsStarted":{"$ref":"common.json#/$defs/count"},"observedParticipantMs":{"$ref":"common.json#/$defs/durationMs"},"connectedParticipantMs":{"$ref":"common.json#/$defs/nullableDurationMs"},"callExposureMs":{"$ref":"common.json#/$defs/durationMs"},"largestCallPeakParticipants":{"$ref":"common.json#/$defs/nullableCount"}}},"joins":{"$ref":"common.json#/$defs/joinAggregate"},"impairments":{"$ref":"common.json#/$defs/impairmentExposures"},"metrics":{"$ref":"common.json#/$defs/metricAggregates"},"findingCounts":{"$ref":"common.json#/$defs/findingCounts"},"cohorts":{"type":"array","items":{"$ref":"#/$defs/cohortAggregate"},"maxItems":2048},"buckets":{"type":"array","items":{"$ref":"#/$defs/periodBucket"},"maxItems":31},"worstCalls":{"type":"array","items":{"$ref":"#/$defs/rankedCall"},"maxItems":20},"callSearchResourceId":{"$ref":"common.json#/$defs/opaqueId"}},"allOf":[{"if":{"properties":{"period":{"const":"day"}},"required":["period"]},"then":{"properties":{"id":{"pattern":"^\\d{4}-\\d{2}-\\d{2}$"},"buckets":{"maxItems":24}}}},{"if":{"properties":{"period":{"const":"month"}},"required":["period"]},"then":{"properties":{"id":{"pattern":"^\\d{4}-\\d{2}$"}}}}],"$defs":{"cohortAggregate":{"type":"object","additionalProperties":false,"required":["dimension","value","observedParticipantMs","impairments","metrics"],"properties":{"dimension":{"$ref":"common.json#/$defs/dimension"},"value":{"oneOf":[{"type":"string","maxLength":256},{"type":"null"}]},"observedParticipantMs":{"$ref":"common.json#/$defs/durationMs"},"impairments":{"$ref":"common.json#/$defs/impairmentExposures"},"metrics":{"$ref":"common.json#/$defs/metricAggregates"}}},"periodBucket":{"type":"object","additionalProperties":false,"required":["range","completeness","callsStarted","observedParticipantMs","impairments"],"properties":{"range":{"$ref":"common.json#/$defs/timeRange"},"completeness":{"$ref":"common.json#/$defs/completeness"},"callsStarted":{"$ref":"common.json#/$defs/count"},"observedParticipantMs":{"$ref":"common.json#/$defs/durationMs"},"impairments":{"$ref":"common.json#/$defs/impairmentExposures"}}},"rankedCall":{"type":"object","additionalProperties":false,"required":["callId","roomId","digestRevision","startedAt","impairedParticipantMs","assessedParticipantMs","completeness"],"properties":{"callId":{"$ref":"common.json#/$defs/opaqueId"},"roomId":{"oneOf":[{"$ref":"common.json#/$defs/opaqueId"},{"type":"null"}]},"digestRevision":{"$ref":"common.json#/$defs/opaqueId"},"startedAt":{"oneOf":[{"$ref":"common.json#/$defs/epochMs"},{"type":"null"}]},"impairedParticipantMs":{"$ref":"common.json#/$defs/durationMs"},"assessedParticipantMs":{"$ref":"common.json#/$defs/durationMs"},"completeness":{"$ref":"common.json#/$defs/completeness"}}}}};
const pattern6 = new RegExp("^\\d{4}-\\d{2}-\\d{2}$", "u");
const pattern7 = new RegExp("^\\d{4}-\\d{2}$", "u");

function validate80(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate80.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.startAt === undefined) && (missing0 = "startAt")) || ((data.endAt === undefined) && (missing0 = "endAt"))){
validate80.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((key0 === "startAt") || (key0 === "endAt"))){
validate80.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.startAt !== undefined){
let data0 = data.startAt;
const _errs2 = errors;
const _errs3 = errors;
if(!((typeof data0 == "number") && (!(data0 % 1) && !isNaN(data0)))){
validate80.errors = [{instancePath:instancePath+"/startAt",schemaPath:"#/$defs/epochMs/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs3){
if(typeof data0 == "number"){
if(data0 > 8640000000000000 || isNaN(data0)){
validate80.errors = [{instancePath:instancePath+"/startAt",schemaPath:"#/$defs/epochMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 8640000000000000},message:"must be <= 8640000000000000"}];
return false;
}
else {
if(data0 < -8640000000000000 || isNaN(data0)){
validate80.errors = [{instancePath:instancePath+"/startAt",schemaPath:"#/$defs/epochMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: -8640000000000000},message:"must be >= -8640000000000000"}];
return false;
}
}
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.endAt !== undefined){
let data1 = data.endAt;
const _errs5 = errors;
const _errs6 = errors;
if(!((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1)))){
validate80.errors = [{instancePath:instancePath+"/endAt",schemaPath:"#/$defs/epochMs/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs6){
if(typeof data1 == "number"){
if(data1 > 8640000000000000 || isNaN(data1)){
validate80.errors = [{instancePath:instancePath+"/endAt",schemaPath:"#/$defs/epochMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 8640000000000000},message:"must be <= 8640000000000000"}];
return false;
}
else {
if(data1 < -8640000000000000 || isNaN(data1)){
validate80.errors = [{instancePath:instancePath+"/endAt",schemaPath:"#/$defs/epochMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: -8640000000000000},message:"must be >= -8640000000000000"}];
return false;
}
}
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
else {
validate80.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate80.errors = vErrors;
return errors === 0;
}
validate80.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate82(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate82.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.processorVersion === undefined) && (missing0 = "processorVersion")) || ((data.policyId === undefined) && (missing0 = "policyId"))) || ((data.sourceRevision === undefined) && (missing0 = "sourceRevision"))) || ((data.generatedAt === undefined) && (missing0 = "generatedAt"))){
validate82.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "processorVersion") || (key0 === "policyId")) || (key0 === "sourceRevision")) || (key0 === "generatedAt"))){
validate82.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.processorVersion !== undefined){
let data0 = data.processorVersion;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 512){
validate82.errors = [{instancePath:instancePath+"/processorVersion",schemaPath:"#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data0) < 1){
validate82.errors = [{instancePath:instancePath+"/processorVersion",schemaPath:"#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate82.errors = [{instancePath:instancePath+"/processorVersion",schemaPath:"#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.policyId !== undefined){
let data1 = data.policyId;
const _errs5 = errors;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data1 === "string"){
if(func1(data1) > 512){
validate82.errors = [{instancePath:instancePath+"/policyId",schemaPath:"#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data1) < 1){
validate82.errors = [{instancePath:instancePath+"/policyId",schemaPath:"#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate82.errors = [{instancePath:instancePath+"/policyId",schemaPath:"#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sourceRevision !== undefined){
let data2 = data.sourceRevision;
const _errs8 = errors;
const _errs9 = errors;
if(errors === _errs9){
if(typeof data2 === "string"){
if(func1(data2) > 512){
validate82.errors = [{instancePath:instancePath+"/sourceRevision",schemaPath:"#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data2) < 1){
validate82.errors = [{instancePath:instancePath+"/sourceRevision",schemaPath:"#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate82.errors = [{instancePath:instancePath+"/sourceRevision",schemaPath:"#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.generatedAt !== undefined){
let data3 = data.generatedAt;
const _errs11 = errors;
const _errs12 = errors;
if(!((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3)))){
validate82.errors = [{instancePath:instancePath+"/generatedAt",schemaPath:"#/$defs/epochMs/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs12){
if(typeof data3 == "number"){
if(data3 > 8640000000000000 || isNaN(data3)){
validate82.errors = [{instancePath:instancePath+"/generatedAt",schemaPath:"#/$defs/epochMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 8640000000000000},message:"must be <= 8640000000000000"}];
return false;
}
else {
if(data3 < -8640000000000000 || isNaN(data3)){
validate82.errors = [{instancePath:instancePath+"/generatedAt",schemaPath:"#/$defs/epochMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: -8640000000000000},message:"must be >= -8640000000000000"}];
return false;
}
}
}
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate82.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate82.errors = vErrors;
return errors === 0;
}
validate82.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate84(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate84.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
const _errs2 = errors;
if(errors === _errs2){
if(typeof data == "number"){
if(data > 9007199254740991 || isNaN(data)){
const err0 = {instancePath,schemaPath:"#/$defs/durationMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(data < 0 || isNaN(data)){
const err1 = {instancePath,schemaPath:"#/$defs/durationMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
else {
const err2 = {instancePath,schemaPath:"#/$defs/durationMs/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
}
const _errs4 = errors;
if(data !== null){
const err3 = {instancePath,schemaPath:"#/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
var _valid0 = _errs4 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
}
}
if(!valid0){
const err4 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
validate84.errors = vErrors;
return false;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate84.errors = vErrors;
return errors === 0;
}
validate84.evaluated = {"dynamicProps":false,"dynamicItems":false};


function validate86(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate86.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
const _errs2 = errors;
if(!((typeof data == "number") && (!(data % 1) && !isNaN(data)))){
const err0 = {instancePath,schemaPath:"#/$defs/count/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(errors === _errs2){
if(typeof data == "number"){
if(data > 9007199254740991 || isNaN(data)){
const err1 = {instancePath,schemaPath:"#/$defs/count/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
else {
if(data < 0 || isNaN(data)){
const err2 = {instancePath,schemaPath:"#/$defs/count/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
}
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
}
const _errs4 = errors;
if(data !== null){
const err3 = {instancePath,schemaPath:"#/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
var _valid0 = _errs4 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
}
}
if(!valid0){
const err4 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
validate86.errors = vErrors;
return false;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate86.errors = vErrors;
return errors === 0;
}
validate86.evaluated = {"dynamicProps":false,"dynamicItems":false};


function validate88(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate88.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs1 = errors;
let valid0 = true;
const _errs2 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.status === undefined) && (missing0 = "status")){
const err0 = {};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(data.status !== undefined){
if("unavailable" !== data.status){
const err1 = {};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
}
var _valid0 = _errs2 === errors;
errors = _errs1;
if(vErrors !== null){
if(_errs1){
vErrors.length = _errs1;
}
else {
vErrors = null;
}
}
if(_valid0){
const _errs4 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.attempts !== undefined){
const _errs5 = errors;
if(data.attempts !== null){
validate88.errors = [{instancePath:instancePath+"/attempts",schemaPath:"#/then/properties/attempts/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
var valid2 = _errs5 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.succeeded !== undefined){
const _errs7 = errors;
if(data.succeeded !== null){
validate88.errors = [{instancePath:instancePath+"/succeeded",schemaPath:"#/then/properties/succeeded/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
var valid2 = _errs7 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.failed !== undefined){
const _errs9 = errors;
if(data.failed !== null){
validate88.errors = [{instancePath:instancePath+"/failed",schemaPath:"#/then/properties/failed/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
var valid2 = _errs9 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.canceled !== undefined){
const _errs11 = errors;
if(data.canceled !== null){
validate88.errors = [{instancePath:instancePath+"/canceled",schemaPath:"#/then/properties/canceled/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
var valid2 = _errs11 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.pending !== undefined){
const _errs13 = errors;
if(data.pending !== null){
validate88.errors = [{instancePath:instancePath+"/pending",schemaPath:"#/then/properties/pending/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
var valid2 = _errs13 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data.unknown !== undefined){
const _errs15 = errors;
if(data.unknown !== null){
validate88.errors = [{instancePath:instancePath+"/unknown",schemaPath:"#/then/properties/unknown/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
var valid2 = _errs15 === errors;
}
else {
var valid2 = true;
}
}
}
}
}
}
}
var _valid0 = _errs4 === errors;
valid0 = _valid0;
if(valid0){
var props0 = {};
props0.attempts = true;
props0.succeeded = true;
props0.failed = true;
props0.canceled = true;
props0.pending = true;
props0.unknown = true;
props0.status = true;
}
}
if(!valid0){
const err2 = {instancePath,schemaPath:"#/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
validate88.errors = vErrors;
return false;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing1;
if((((((((data.status === undefined) && (missing1 = "status")) || ((data.attempts === undefined) && (missing1 = "attempts"))) || ((data.succeeded === undefined) && (missing1 = "succeeded"))) || ((data.failed === undefined) && (missing1 = "failed"))) || ((data.canceled === undefined) && (missing1 = "canceled"))) || ((data.pending === undefined) && (missing1 = "pending"))) || ((data.unknown === undefined) && (missing1 = "unknown"))){
validate88.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs17 = errors;
for(const key0 in data){
if(!(((((((key0 === "status") || (key0 === "attempts")) || (key0 === "succeeded")) || (key0 === "failed")) || (key0 === "canceled")) || (key0 === "pending")) || (key0 === "unknown"))){
validate88.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs17 === errors){
if(data.status !== undefined){
let data7 = data.status;
const _errs18 = errors;
if(!(((data7 === "available") || (data7 === "partial")) || (data7 === "unavailable"))){
validate88.errors = [{instancePath:instancePath+"/status",schemaPath:"#/$defs/capabilityState/enum",keyword:"enum",params:{allowedValues: schema59.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid3 = _errs18 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.attempts !== undefined){
const _errs20 = errors;
if(!(validate27(data.attempts, {instancePath:instancePath+"/attempts",parentData:data,parentDataProperty:"attempts",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
errors = vErrors.length;
}
var valid3 = _errs20 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.succeeded !== undefined){
const _errs21 = errors;
if(!(validate27(data.succeeded, {instancePath:instancePath+"/succeeded",parentData:data,parentDataProperty:"succeeded",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
errors = vErrors.length;
}
var valid3 = _errs21 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.failed !== undefined){
const _errs22 = errors;
if(!(validate27(data.failed, {instancePath:instancePath+"/failed",parentData:data,parentDataProperty:"failed",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
errors = vErrors.length;
}
var valid3 = _errs22 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.canceled !== undefined){
const _errs23 = errors;
if(!(validate27(data.canceled, {instancePath:instancePath+"/canceled",parentData:data,parentDataProperty:"canceled",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
errors = vErrors.length;
}
var valid3 = _errs23 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.pending !== undefined){
const _errs24 = errors;
if(!(validate27(data.pending, {instancePath:instancePath+"/pending",parentData:data,parentDataProperty:"pending",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
errors = vErrors.length;
}
var valid3 = _errs24 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.unknown !== undefined){
const _errs25 = errors;
if(!(validate27(data.unknown, {instancePath:instancePath+"/unknown",parentData:data,parentDataProperty:"unknown",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
errors = vErrors.length;
}
var valid3 = _errs25 === errors;
}
else {
var valid3 = true;
}
}
}
}
}
}
}
}
}
}
else {
validate88.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate88.errors = vErrors;
return errors === 0;
}
validate88.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate96(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate96.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(Array.isArray(data)){
if(data.length > 5){
validate96.errors = [{instancePath,schemaPath:"#/maxItems",keyword:"maxItems",params:{limit: 5},message:"must NOT have more than 5 items"}];
return false;
}
else {
var valid0 = true;
const len0 = data.length;
for(let i0=0; i0<len0; i0++){
const _errs1 = errors;
if(!(validate56(data[i0], {instancePath:instancePath+"/" + i0,parentData:data,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
errors = vErrors.length;
}
var valid0 = _errs1 === errors;
if(!valid0){
break;
}
}
}
}
else {
validate96.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
validate96.errors = vErrors;
return errors === 0;
}
validate96.evaluated = {"items":true,"dynamicProps":false,"dynamicItems":false};


function validate99(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate99.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(Array.isArray(data)){
if(data.length > 512){
validate99.errors = [{instancePath,schemaPath:"#/maxItems",keyword:"maxItems",params:{limit: 512},message:"must NOT have more than 512 items"}];
return false;
}
else {
var valid0 = true;
const len0 = data.length;
for(let i0=0; i0<len0; i0++){
const _errs1 = errors;
if(!(validate60(data[i0], {instancePath:instancePath+"/" + i0,parentData:data,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate60.errors : vErrors.concat(validate60.errors);
errors = vErrors.length;
}
var valid0 = _errs1 === errors;
if(!valid0){
break;
}
}
}
}
else {
validate99.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
validate99.errors = vErrors;
return errors === 0;
}
validate99.evaluated = {"items":true,"dynamicProps":false,"dynamicItems":false};


function validate102(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate102.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(Array.isArray(data)){
if(data.length > 128){
validate102.errors = [{instancePath,schemaPath:"#/maxItems",keyword:"maxItems",params:{limit: 128},message:"must NOT have more than 128 items"}];
return false;
}
else {
var valid0 = true;
const len0 = data.length;
for(let i0=0; i0<len0; i0++){
const _errs1 = errors;
if(!(validate68(data[i0], {instancePath:instancePath+"/" + i0,parentData:data,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate68.errors : vErrors.concat(validate68.errors);
errors = vErrors.length;
}
var valid0 = _errs1 === errors;
if(!valid0){
break;
}
}
}
}
else {
validate102.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
validate102.errors = vErrors;
return errors === 0;
}
validate102.evaluated = {"items":true,"dynamicProps":false,"dynamicItems":false};

const schema133 = {"type":"object","additionalProperties":false,"required":["dimension","value","observedParticipantMs","impairments","metrics"],"properties":{"dimension":{"$ref":"common.json#/$defs/dimension"},"value":{"oneOf":[{"type":"string","maxLength":256},{"type":"null"}]},"observedParticipantMs":{"$ref":"common.json#/$defs/durationMs"},"impairments":{"$ref":"common.json#/$defs/impairmentExposures"},"metrics":{"$ref":"common.json#/$defs/metricAggregates"}}};
const schema134 = {"enum":["browser","browserMajorVersion","os","appVersion","sdkVersion","producer","region","sfuId","turnServer"]};

function validate105(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate105.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.dimension === undefined) && (missing0 = "dimension")) || ((data.value === undefined) && (missing0 = "value"))) || ((data.observedParticipantMs === undefined) && (missing0 = "observedParticipantMs"))) || ((data.impairments === undefined) && (missing0 = "impairments"))) || ((data.metrics === undefined) && (missing0 = "metrics"))){
validate105.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((key0 === "dimension") || (key0 === "value")) || (key0 === "observedParticipantMs")) || (key0 === "impairments")) || (key0 === "metrics"))){
validate105.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.dimension !== undefined){
let data0 = data.dimension;
const _errs2 = errors;
if(!(((((((((data0 === "browser") || (data0 === "browserMajorVersion")) || (data0 === "os")) || (data0 === "appVersion")) || (data0 === "sdkVersion")) || (data0 === "producer")) || (data0 === "region")) || (data0 === "sfuId")) || (data0 === "turnServer"))){
validate105.errors = [{instancePath:instancePath+"/dimension",schemaPath:"common.json#/$defs/dimension/enum",keyword:"enum",params:{allowedValues: schema134.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.value !== undefined){
let data1 = data.value;
const _errs4 = errors;
const _errs5 = errors;
let valid2 = false;
let passing0 = null;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data1 === "string"){
if(func1(data1) > 256){
const err0 = {instancePath:instancePath+"/value",schemaPath:"#/properties/value/oneOf/0/maxLength",keyword:"maxLength",params:{limit: 256},message:"must NOT have more than 256 characters"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
}
else {
const err1 = {instancePath:instancePath+"/value",schemaPath:"#/properties/value/oneOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
var _valid0 = _errs6 === errors;
if(_valid0){
valid2 = true;
passing0 = 0;
}
const _errs8 = errors;
if(data1 !== null){
const err2 = {instancePath:instancePath+"/value",schemaPath:"#/properties/value/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
var _valid0 = _errs8 === errors;
if(_valid0 && valid2){
valid2 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid2 = true;
passing0 = 1;
}
}
if(!valid2){
const err3 = {instancePath:instancePath+"/value",schemaPath:"#/properties/value/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
validate105.errors = vErrors;
return false;
}
else {
errors = _errs5;
if(vErrors !== null){
if(_errs5){
vErrors.length = _errs5;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.observedParticipantMs !== undefined){
let data2 = data.observedParticipantMs;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data2 == "number"){
if(data2 > 9007199254740991 || isNaN(data2)){
validate105.errors = [{instancePath:instancePath+"/observedParticipantMs",schemaPath:"common.json#/$defs/durationMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data2 < 0 || isNaN(data2)){
validate105.errors = [{instancePath:instancePath+"/observedParticipantMs",schemaPath:"common.json#/$defs/durationMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
else {
validate105.errors = [{instancePath:instancePath+"/observedParticipantMs",schemaPath:"common.json#/$defs/durationMs/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.impairments !== undefined){
const _errs13 = errors;
if(!(validate96(data.impairments, {instancePath:instancePath+"/impairments",parentData:data,parentDataProperty:"impairments",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate96.errors : vErrors.concat(validate96.errors);
errors = vErrors.length;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.metrics !== undefined){
const _errs14 = errors;
if(!(validate99(data.metrics, {instancePath:instancePath+"/metrics",parentData:data,parentDataProperty:"metrics",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate99.errors : vErrors.concat(validate99.errors);
errors = vErrors.length;
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate105.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate105.errors = vErrors;
return errors === 0;
}
validate105.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema136 = {"type":"object","additionalProperties":false,"required":["range","completeness","callsStarted","observedParticipantMs","impairments"],"properties":{"range":{"$ref":"common.json#/$defs/timeRange"},"completeness":{"$ref":"common.json#/$defs/completeness"},"callsStarted":{"$ref":"common.json#/$defs/count"},"observedParticipantMs":{"$ref":"common.json#/$defs/durationMs"},"impairments":{"$ref":"common.json#/$defs/impairmentExposures"}}};

function validate109(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate109.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.range === undefined) && (missing0 = "range")) || ((data.completeness === undefined) && (missing0 = "completeness"))) || ((data.callsStarted === undefined) && (missing0 = "callsStarted"))) || ((data.observedParticipantMs === undefined) && (missing0 = "observedParticipantMs"))) || ((data.impairments === undefined) && (missing0 = "impairments"))){
validate109.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((key0 === "range") || (key0 === "completeness")) || (key0 === "callsStarted")) || (key0 === "observedParticipantMs")) || (key0 === "impairments"))){
validate109.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.range !== undefined){
const _errs2 = errors;
if(!(validate80(data.range, {instancePath:instancePath+"/range",parentData:data,parentDataProperty:"range",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate80.errors : vErrors.concat(validate80.errors);
errors = vErrors.length;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.completeness !== undefined){
let data1 = data.completeness;
const _errs3 = errors;
if(!(((data1 === "complete") || (data1 === "partial")) || (data1 === "unknown"))){
validate109.errors = [{instancePath:instancePath+"/completeness",schemaPath:"common.json#/$defs/completeness/enum",keyword:"enum",params:{allowedValues: schema47.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.callsStarted !== undefined){
let data2 = data.callsStarted;
const _errs5 = errors;
const _errs6 = errors;
if(!((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2)))){
validate109.errors = [{instancePath:instancePath+"/callsStarted",schemaPath:"common.json#/$defs/count/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs6){
if(typeof data2 == "number"){
if(data2 > 9007199254740991 || isNaN(data2)){
validate109.errors = [{instancePath:instancePath+"/callsStarted",schemaPath:"common.json#/$defs/count/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data2 < 0 || isNaN(data2)){
validate109.errors = [{instancePath:instancePath+"/callsStarted",schemaPath:"common.json#/$defs/count/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.observedParticipantMs !== undefined){
let data3 = data.observedParticipantMs;
const _errs8 = errors;
const _errs9 = errors;
if(errors === _errs9){
if(typeof data3 == "number"){
if(data3 > 9007199254740991 || isNaN(data3)){
validate109.errors = [{instancePath:instancePath+"/observedParticipantMs",schemaPath:"common.json#/$defs/durationMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data3 < 0 || isNaN(data3)){
validate109.errors = [{instancePath:instancePath+"/observedParticipantMs",schemaPath:"common.json#/$defs/durationMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
else {
validate109.errors = [{instancePath:instancePath+"/observedParticipantMs",schemaPath:"common.json#/$defs/durationMs/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.impairments !== undefined){
const _errs11 = errors;
if(!(validate96(data.impairments, {instancePath:instancePath+"/impairments",parentData:data,parentDataProperty:"impairments",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate96.errors : vErrors.concat(validate96.errors);
errors = vErrors.length;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate109.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate109.errors = vErrors;
return errors === 0;
}
validate109.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema140 = {"type":"object","additionalProperties":false,"required":["callId","roomId","digestRevision","startedAt","impairedParticipantMs","assessedParticipantMs","completeness"],"properties":{"callId":{"$ref":"common.json#/$defs/opaqueId"},"roomId":{"oneOf":[{"$ref":"common.json#/$defs/opaqueId"},{"type":"null"}]},"digestRevision":{"$ref":"common.json#/$defs/opaqueId"},"startedAt":{"oneOf":[{"$ref":"common.json#/$defs/epochMs"},{"type":"null"}]},"impairedParticipantMs":{"$ref":"common.json#/$defs/durationMs"},"assessedParticipantMs":{"$ref":"common.json#/$defs/durationMs"},"completeness":{"$ref":"common.json#/$defs/completeness"}}};

function validate113(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate113.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((data.callId === undefined) && (missing0 = "callId")) || ((data.roomId === undefined) && (missing0 = "roomId"))) || ((data.digestRevision === undefined) && (missing0 = "digestRevision"))) || ((data.startedAt === undefined) && (missing0 = "startedAt"))) || ((data.impairedParticipantMs === undefined) && (missing0 = "impairedParticipantMs"))) || ((data.assessedParticipantMs === undefined) && (missing0 = "assessedParticipantMs"))) || ((data.completeness === undefined) && (missing0 = "completeness"))){
validate113.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((((key0 === "callId") || (key0 === "roomId")) || (key0 === "digestRevision")) || (key0 === "startedAt")) || (key0 === "impairedParticipantMs")) || (key0 === "assessedParticipantMs")) || (key0 === "completeness"))){
validate113.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.callId !== undefined){
let data0 = data.callId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 512){
validate113.errors = [{instancePath:instancePath+"/callId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data0) < 1){
validate113.errors = [{instancePath:instancePath+"/callId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate113.errors = [{instancePath:instancePath+"/callId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.roomId !== undefined){
let data1 = data.roomId;
const _errs5 = errors;
const _errs6 = errors;
let valid2 = false;
let passing0 = null;
const _errs7 = errors;
const _errs8 = errors;
if(errors === _errs8){
if(typeof data1 === "string"){
if(func1(data1) > 512){
const err0 = {instancePath:instancePath+"/roomId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(func1(data1) < 1){
const err1 = {instancePath:instancePath+"/roomId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
else {
const err2 = {instancePath:instancePath+"/roomId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
var _valid0 = _errs7 === errors;
if(_valid0){
valid2 = true;
passing0 = 0;
}
const _errs10 = errors;
if(data1 !== null){
const err3 = {instancePath:instancePath+"/roomId",schemaPath:"#/properties/roomId/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
var _valid0 = _errs10 === errors;
if(_valid0 && valid2){
valid2 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid2 = true;
passing0 = 1;
}
}
if(!valid2){
const err4 = {instancePath:instancePath+"/roomId",schemaPath:"#/properties/roomId/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
validate113.errors = vErrors;
return false;
}
else {
errors = _errs6;
if(vErrors !== null){
if(_errs6){
vErrors.length = _errs6;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.digestRevision !== undefined){
let data2 = data.digestRevision;
const _errs12 = errors;
const _errs13 = errors;
if(errors === _errs13){
if(typeof data2 === "string"){
if(func1(data2) > 512){
validate113.errors = [{instancePath:instancePath+"/digestRevision",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data2) < 1){
validate113.errors = [{instancePath:instancePath+"/digestRevision",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate113.errors = [{instancePath:instancePath+"/digestRevision",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.startedAt !== undefined){
let data3 = data.startedAt;
const _errs15 = errors;
const _errs16 = errors;
let valid5 = false;
let passing1 = null;
const _errs17 = errors;
const _errs18 = errors;
if(!((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3)))){
const err5 = {instancePath:instancePath+"/startedAt",schemaPath:"common.json#/$defs/epochMs/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(errors === _errs18){
if(typeof data3 == "number"){
if(data3 > 8640000000000000 || isNaN(data3)){
const err6 = {instancePath:instancePath+"/startedAt",schemaPath:"common.json#/$defs/epochMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 8640000000000000},message:"must be <= 8640000000000000"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
else {
if(data3 < -8640000000000000 || isNaN(data3)){
const err7 = {instancePath:instancePath+"/startedAt",schemaPath:"common.json#/$defs/epochMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: -8640000000000000},message:"must be >= -8640000000000000"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
}
}
var _valid1 = _errs17 === errors;
if(_valid1){
valid5 = true;
passing1 = 0;
}
const _errs20 = errors;
if(data3 !== null){
const err8 = {instancePath:instancePath+"/startedAt",schemaPath:"#/properties/startedAt/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
var _valid1 = _errs20 === errors;
if(_valid1 && valid5){
valid5 = false;
passing1 = [passing1, 1];
}
else {
if(_valid1){
valid5 = true;
passing1 = 1;
}
}
if(!valid5){
const err9 = {instancePath:instancePath+"/startedAt",schemaPath:"#/properties/startedAt/oneOf",keyword:"oneOf",params:{passingSchemas: passing1},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
validate113.errors = vErrors;
return false;
}
else {
errors = _errs16;
if(vErrors !== null){
if(_errs16){
vErrors.length = _errs16;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.impairedParticipantMs !== undefined){
let data4 = data.impairedParticipantMs;
const _errs22 = errors;
const _errs23 = errors;
if(errors === _errs23){
if(typeof data4 == "number"){
if(data4 > 9007199254740991 || isNaN(data4)){
validate113.errors = [{instancePath:instancePath+"/impairedParticipantMs",schemaPath:"common.json#/$defs/durationMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data4 < 0 || isNaN(data4)){
validate113.errors = [{instancePath:instancePath+"/impairedParticipantMs",schemaPath:"common.json#/$defs/durationMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
else {
validate113.errors = [{instancePath:instancePath+"/impairedParticipantMs",schemaPath:"common.json#/$defs/durationMs/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid0 = _errs22 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.assessedParticipantMs !== undefined){
let data5 = data.assessedParticipantMs;
const _errs25 = errors;
const _errs26 = errors;
if(errors === _errs26){
if(typeof data5 == "number"){
if(data5 > 9007199254740991 || isNaN(data5)){
validate113.errors = [{instancePath:instancePath+"/assessedParticipantMs",schemaPath:"common.json#/$defs/durationMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data5 < 0 || isNaN(data5)){
validate113.errors = [{instancePath:instancePath+"/assessedParticipantMs",schemaPath:"common.json#/$defs/durationMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
else {
validate113.errors = [{instancePath:instancePath+"/assessedParticipantMs",schemaPath:"common.json#/$defs/durationMs/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid0 = _errs25 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.completeness !== undefined){
let data6 = data.completeness;
const _errs28 = errors;
if(!(((data6 === "complete") || (data6 === "partial")) || (data6 === "unknown"))){
validate113.errors = [{instancePath:instancePath+"/completeness",schemaPath:"common.json#/$defs/completeness/enum",keyword:"enum",params:{allowedValues: schema47.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs28 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
else {
validate113.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate113.errors = vErrors;
return errors === 0;
}
validate113.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate79(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="https://schemas.observertc.org/digest/v1/period-digest.json" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate79.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs1 = errors;
const _errs2 = errors;
let valid1 = true;
const _errs3 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.period === undefined) && (missing0 = "period")){
const err0 = {};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(data.period !== undefined){
if("day" !== data.period){
const err1 = {};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
}
var _valid0 = _errs3 === errors;
errors = _errs2;
if(vErrors !== null){
if(_errs2){
vErrors.length = _errs2;
}
else {
vErrors = null;
}
}
if(_valid0){
const _errs5 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.id !== undefined){
let data1 = data.id;
const _errs6 = errors;
if(typeof data1 === "string"){
if(!pattern6.test(data1)){
validate79.errors = [{instancePath:instancePath+"/id",schemaPath:"#/allOf/0/then/properties/id/pattern",keyword:"pattern",params:{pattern: "^\\d{4}-\\d{2}-\\d{2}$"},message:"must match pattern \""+"^\\d{4}-\\d{2}-\\d{2}$"+"\""}];
return false;
}
}
var valid3 = _errs6 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.buckets !== undefined){
let data2 = data.buckets;
const _errs7 = errors;
if(Array.isArray(data2)){
if(data2.length > 24){
validate79.errors = [{instancePath:instancePath+"/buckets",schemaPath:"#/allOf/0/then/properties/buckets/maxItems",keyword:"maxItems",params:{limit: 24},message:"must NOT have more than 24 items"}];
return false;
}
}
var valid3 = _errs7 === errors;
}
else {
var valid3 = true;
}
}
}
var _valid0 = _errs5 === errors;
valid1 = _valid0;
if(valid1){
var props0 = {};
props0.id = true;
props0.buckets = true;
props0.period = true;
}
}
if(!valid1){
const err2 = {instancePath,schemaPath:"#/allOf/0/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
validate79.errors = vErrors;
return false;
}
var valid0 = _errs1 === errors;
if(valid0){
const _errs8 = errors;
const _errs9 = errors;
let valid4 = true;
const _errs10 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing1;
if((data.period === undefined) && (missing1 = "period")){
const err3 = {};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
else {
if(data.period !== undefined){
if("month" !== data.period){
const err4 = {};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
}
}
var _valid1 = _errs10 === errors;
errors = _errs9;
if(vErrors !== null){
if(_errs9){
vErrors.length = _errs9;
}
else {
vErrors = null;
}
}
if(_valid1){
const _errs12 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.id !== undefined){
let data4 = data.id;
if(typeof data4 === "string"){
if(!pattern7.test(data4)){
validate79.errors = [{instancePath:instancePath+"/id",schemaPath:"#/allOf/1/then/properties/id/pattern",keyword:"pattern",params:{pattern: "^\\d{4}-\\d{2}$"},message:"must match pattern \""+"^\\d{4}-\\d{2}$"+"\""}];
return false;
}
}
}
}
var _valid1 = _errs12 === errors;
valid4 = _valid1;
if(valid4){
var props1 = {};
props1.id = true;
props1.period = true;
}
}
if(!valid4){
const err5 = {instancePath,schemaPath:"#/allOf/1/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
validate79.errors = vErrors;
return false;
}
var valid0 = _errs8 === errors;
if(valid0){
if(props0 !== true && props1 !== undefined){
if(props1 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props1);
}
}
}
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing2;
if((((((((((((((((((((data.kind === undefined) && (missing2 = "kind")) || ((data.schemaVersion === undefined) && (missing2 = "schemaVersion"))) || ((data.tenantId === undefined) && (missing2 = "tenantId"))) || ((data.period === undefined) && (missing2 = "period"))) || ((data.id === undefined) && (missing2 = "id"))) || ((data.range === undefined) && (missing2 = "range"))) || ((data.revision === undefined) && (missing2 = "revision"))) || ((data.provenance === undefined) && (missing2 = "provenance"))) || ((data.completeness === undefined) && (missing2 = "completeness"))) || ((data.coverage === undefined) && (missing2 = "coverage"))) || ((data.totals === undefined) && (missing2 = "totals"))) || ((data.joins === undefined) && (missing2 = "joins"))) || ((data.impairments === undefined) && (missing2 = "impairments"))) || ((data.metrics === undefined) && (missing2 = "metrics"))) || ((data.findingCounts === undefined) && (missing2 = "findingCounts"))) || ((data.cohorts === undefined) && (missing2 = "cohorts"))) || ((data.buckets === undefined) && (missing2 = "buckets"))) || ((data.worstCalls === undefined) && (missing2 = "worstCalls"))) || ((data.callSearchResourceId === undefined) && (missing2 = "callSearchResourceId"))){
validate79.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing2},message:"must have required property '"+missing2+"'"}];
return false;
}
else {
if(data.kind !== undefined){
const _errs15 = errors;
if("period-digest" !== data.kind){
validate79.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/const",keyword:"const",params:{allowedValue: "period-digest"},message:"must be equal to constant"}];
return false;
}
var valid7 = _errs15 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.schemaVersion !== undefined){
const _errs16 = errors;
if(1 !== data.schemaVersion){
validate79.errors = [{instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"}];
return false;
}
var valid7 = _errs16 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.tenantId !== undefined){
let data7 = data.tenantId;
const _errs17 = errors;
const _errs18 = errors;
if(errors === _errs18){
if(typeof data7 === "string"){
if(func1(data7) > 512){
validate79.errors = [{instancePath:instancePath+"/tenantId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data7) < 1){
validate79.errors = [{instancePath:instancePath+"/tenantId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate79.errors = [{instancePath:instancePath+"/tenantId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid7 = _errs17 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.period !== undefined){
let data8 = data.period;
const _errs20 = errors;
if(!((data8 === "day") || (data8 === "month"))){
validate79.errors = [{instancePath:instancePath+"/period",schemaPath:"#/properties/period/enum",keyword:"enum",params:{allowedValues: schema100.properties.period.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid7 = _errs20 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.id !== undefined){
let data9 = data.id;
const _errs21 = errors;
if(errors === _errs21){
if(typeof data9 === "string"){
if(func1(data9) > 10){
validate79.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/maxLength",keyword:"maxLength",params:{limit: 10},message:"must NOT have more than 10 characters"}];
return false;
}
else {
if(func1(data9) < 7){
validate79.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/minLength",keyword:"minLength",params:{limit: 7},message:"must NOT have fewer than 7 characters"}];
return false;
}
}
}
else {
validate79.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid7 = _errs21 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.range !== undefined){
const _errs23 = errors;
if(!(validate80(data.range, {instancePath:instancePath+"/range",parentData:data,parentDataProperty:"range",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate80.errors : vErrors.concat(validate80.errors);
errors = vErrors.length;
}
var valid7 = _errs23 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.revision !== undefined){
let data11 = data.revision;
const _errs24 = errors;
const _errs25 = errors;
if(errors === _errs25){
if(typeof data11 === "string"){
if(func1(data11) > 512){
validate79.errors = [{instancePath:instancePath+"/revision",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data11) < 1){
validate79.errors = [{instancePath:instancePath+"/revision",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate79.errors = [{instancePath:instancePath+"/revision",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid7 = _errs24 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.provenance !== undefined){
const _errs27 = errors;
if(!(validate82(data.provenance, {instancePath:instancePath+"/provenance",parentData:data,parentDataProperty:"provenance",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate82.errors : vErrors.concat(validate82.errors);
errors = vErrors.length;
}
var valid7 = _errs27 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.completeness !== undefined){
let data13 = data.completeness;
const _errs28 = errors;
if(!(((data13 === "complete") || (data13 === "partial")) || (data13 === "unknown"))){
validate79.errors = [{instancePath:instancePath+"/completeness",schemaPath:"common.json#/$defs/completeness/enum",keyword:"enum",params:{allowedValues: schema47.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid7 = _errs28 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.coverage !== undefined){
let data14 = data.coverage;
const _errs30 = errors;
if(errors === _errs30){
if(data14 && typeof data14 == "object" && !Array.isArray(data14)){
let missing3;
if((((((((data14.indexedCalls === undefined) && (missing3 = "indexedCalls")) || ((data14.readableCallDigests === undefined) && (missing3 = "readableCallDigests"))) || ((data14.pendingCallDigests === undefined) && (missing3 = "pendingCallDigests"))) || ((data14.failedCallDigests === undefined) && (missing3 = "failedCallDigests"))) || ((data14.unknownCallDigests === undefined) && (missing3 = "unknownCallDigests"))) || ((data14.expectedChildPeriods === undefined) && (missing3 = "expectedChildPeriods"))) || ((data14.includedChildPeriods === undefined) && (missing3 = "includedChildPeriods"))){
validate79.errors = [{instancePath:instancePath+"/coverage",schemaPath:"#/properties/coverage/required",keyword:"required",params:{missingProperty: missing3},message:"must have required property '"+missing3+"'"}];
return false;
}
else {
const _errs32 = errors;
for(const key0 in data14){
if(!(((((((key0 === "indexedCalls") || (key0 === "readableCallDigests")) || (key0 === "pendingCallDigests")) || (key0 === "failedCallDigests")) || (key0 === "unknownCallDigests")) || (key0 === "expectedChildPeriods")) || (key0 === "includedChildPeriods"))){
validate79.errors = [{instancePath:instancePath+"/coverage",schemaPath:"#/properties/coverage/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs32 === errors){
if(data14.indexedCalls !== undefined){
let data15 = data14.indexedCalls;
const _errs33 = errors;
const _errs34 = errors;
if(!((typeof data15 == "number") && (!(data15 % 1) && !isNaN(data15)))){
validate79.errors = [{instancePath:instancePath+"/coverage/indexedCalls",schemaPath:"common.json#/$defs/count/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs34){
if(typeof data15 == "number"){
if(data15 > 9007199254740991 || isNaN(data15)){
validate79.errors = [{instancePath:instancePath+"/coverage/indexedCalls",schemaPath:"common.json#/$defs/count/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data15 < 0 || isNaN(data15)){
validate79.errors = [{instancePath:instancePath+"/coverage/indexedCalls",schemaPath:"common.json#/$defs/count/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid11 = _errs33 === errors;
}
else {
var valid11 = true;
}
if(valid11){
if(data14.readableCallDigests !== undefined){
let data16 = data14.readableCallDigests;
const _errs36 = errors;
const _errs37 = errors;
if(!((typeof data16 == "number") && (!(data16 % 1) && !isNaN(data16)))){
validate79.errors = [{instancePath:instancePath+"/coverage/readableCallDigests",schemaPath:"common.json#/$defs/count/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs37){
if(typeof data16 == "number"){
if(data16 > 9007199254740991 || isNaN(data16)){
validate79.errors = [{instancePath:instancePath+"/coverage/readableCallDigests",schemaPath:"common.json#/$defs/count/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data16 < 0 || isNaN(data16)){
validate79.errors = [{instancePath:instancePath+"/coverage/readableCallDigests",schemaPath:"common.json#/$defs/count/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid11 = _errs36 === errors;
}
else {
var valid11 = true;
}
if(valid11){
if(data14.pendingCallDigests !== undefined){
let data17 = data14.pendingCallDigests;
const _errs39 = errors;
const _errs40 = errors;
if(!((typeof data17 == "number") && (!(data17 % 1) && !isNaN(data17)))){
validate79.errors = [{instancePath:instancePath+"/coverage/pendingCallDigests",schemaPath:"common.json#/$defs/count/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs40){
if(typeof data17 == "number"){
if(data17 > 9007199254740991 || isNaN(data17)){
validate79.errors = [{instancePath:instancePath+"/coverage/pendingCallDigests",schemaPath:"common.json#/$defs/count/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data17 < 0 || isNaN(data17)){
validate79.errors = [{instancePath:instancePath+"/coverage/pendingCallDigests",schemaPath:"common.json#/$defs/count/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid11 = _errs39 === errors;
}
else {
var valid11 = true;
}
if(valid11){
if(data14.failedCallDigests !== undefined){
let data18 = data14.failedCallDigests;
const _errs42 = errors;
const _errs43 = errors;
if(!((typeof data18 == "number") && (!(data18 % 1) && !isNaN(data18)))){
validate79.errors = [{instancePath:instancePath+"/coverage/failedCallDigests",schemaPath:"common.json#/$defs/count/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs43){
if(typeof data18 == "number"){
if(data18 > 9007199254740991 || isNaN(data18)){
validate79.errors = [{instancePath:instancePath+"/coverage/failedCallDigests",schemaPath:"common.json#/$defs/count/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data18 < 0 || isNaN(data18)){
validate79.errors = [{instancePath:instancePath+"/coverage/failedCallDigests",schemaPath:"common.json#/$defs/count/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid11 = _errs42 === errors;
}
else {
var valid11 = true;
}
if(valid11){
if(data14.unknownCallDigests !== undefined){
let data19 = data14.unknownCallDigests;
const _errs45 = errors;
const _errs46 = errors;
if(!((typeof data19 == "number") && (!(data19 % 1) && !isNaN(data19)))){
validate79.errors = [{instancePath:instancePath+"/coverage/unknownCallDigests",schemaPath:"common.json#/$defs/count/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs46){
if(typeof data19 == "number"){
if(data19 > 9007199254740991 || isNaN(data19)){
validate79.errors = [{instancePath:instancePath+"/coverage/unknownCallDigests",schemaPath:"common.json#/$defs/count/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data19 < 0 || isNaN(data19)){
validate79.errors = [{instancePath:instancePath+"/coverage/unknownCallDigests",schemaPath:"common.json#/$defs/count/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid11 = _errs45 === errors;
}
else {
var valid11 = true;
}
if(valid11){
if(data14.expectedChildPeriods !== undefined){
let data20 = data14.expectedChildPeriods;
const _errs48 = errors;
const _errs49 = errors;
if(!((typeof data20 == "number") && (!(data20 % 1) && !isNaN(data20)))){
validate79.errors = [{instancePath:instancePath+"/coverage/expectedChildPeriods",schemaPath:"common.json#/$defs/count/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs49){
if(typeof data20 == "number"){
if(data20 > 9007199254740991 || isNaN(data20)){
validate79.errors = [{instancePath:instancePath+"/coverage/expectedChildPeriods",schemaPath:"common.json#/$defs/count/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data20 < 0 || isNaN(data20)){
validate79.errors = [{instancePath:instancePath+"/coverage/expectedChildPeriods",schemaPath:"common.json#/$defs/count/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid11 = _errs48 === errors;
}
else {
var valid11 = true;
}
if(valid11){
if(data14.includedChildPeriods !== undefined){
let data21 = data14.includedChildPeriods;
const _errs51 = errors;
const _errs52 = errors;
if(!((typeof data21 == "number") && (!(data21 % 1) && !isNaN(data21)))){
validate79.errors = [{instancePath:instancePath+"/coverage/includedChildPeriods",schemaPath:"common.json#/$defs/count/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs52){
if(typeof data21 == "number"){
if(data21 > 9007199254740991 || isNaN(data21)){
validate79.errors = [{instancePath:instancePath+"/coverage/includedChildPeriods",schemaPath:"common.json#/$defs/count/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data21 < 0 || isNaN(data21)){
validate79.errors = [{instancePath:instancePath+"/coverage/includedChildPeriods",schemaPath:"common.json#/$defs/count/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid11 = _errs51 === errors;
}
else {
var valid11 = true;
}
}
}
}
}
}
}
}
}
}
else {
validate79.errors = [{instancePath:instancePath+"/coverage",schemaPath:"#/properties/coverage/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid7 = _errs30 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.totals !== undefined){
let data22 = data.totals;
const _errs54 = errors;
if(errors === _errs54){
if(data22 && typeof data22 == "object" && !Array.isArray(data22)){
let missing4;
if((((((((data22.callsStarted === undefined) && (missing4 = "callsStarted")) || ((data22.callsWithExposure === undefined) && (missing4 = "callsWithExposure"))) || ((data22.participantSessionsStarted === undefined) && (missing4 = "participantSessionsStarted"))) || ((data22.observedParticipantMs === undefined) && (missing4 = "observedParticipantMs"))) || ((data22.connectedParticipantMs === undefined) && (missing4 = "connectedParticipantMs"))) || ((data22.callExposureMs === undefined) && (missing4 = "callExposureMs"))) || ((data22.largestCallPeakParticipants === undefined) && (missing4 = "largestCallPeakParticipants"))){
validate79.errors = [{instancePath:instancePath+"/totals",schemaPath:"#/properties/totals/required",keyword:"required",params:{missingProperty: missing4},message:"must have required property '"+missing4+"'"}];
return false;
}
else {
const _errs56 = errors;
for(const key1 in data22){
if(!(((((((key1 === "callsStarted") || (key1 === "callsWithExposure")) || (key1 === "participantSessionsStarted")) || (key1 === "observedParticipantMs")) || (key1 === "connectedParticipantMs")) || (key1 === "callExposureMs")) || (key1 === "largestCallPeakParticipants"))){
validate79.errors = [{instancePath:instancePath+"/totals",schemaPath:"#/properties/totals/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs56 === errors){
if(data22.callsStarted !== undefined){
let data23 = data22.callsStarted;
const _errs57 = errors;
const _errs58 = errors;
if(!((typeof data23 == "number") && (!(data23 % 1) && !isNaN(data23)))){
validate79.errors = [{instancePath:instancePath+"/totals/callsStarted",schemaPath:"common.json#/$defs/count/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs58){
if(typeof data23 == "number"){
if(data23 > 9007199254740991 || isNaN(data23)){
validate79.errors = [{instancePath:instancePath+"/totals/callsStarted",schemaPath:"common.json#/$defs/count/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data23 < 0 || isNaN(data23)){
validate79.errors = [{instancePath:instancePath+"/totals/callsStarted",schemaPath:"common.json#/$defs/count/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid19 = _errs57 === errors;
}
else {
var valid19 = true;
}
if(valid19){
if(data22.callsWithExposure !== undefined){
let data24 = data22.callsWithExposure;
const _errs60 = errors;
const _errs61 = errors;
if(!((typeof data24 == "number") && (!(data24 % 1) && !isNaN(data24)))){
validate79.errors = [{instancePath:instancePath+"/totals/callsWithExposure",schemaPath:"common.json#/$defs/count/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs61){
if(typeof data24 == "number"){
if(data24 > 9007199254740991 || isNaN(data24)){
validate79.errors = [{instancePath:instancePath+"/totals/callsWithExposure",schemaPath:"common.json#/$defs/count/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data24 < 0 || isNaN(data24)){
validate79.errors = [{instancePath:instancePath+"/totals/callsWithExposure",schemaPath:"common.json#/$defs/count/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid19 = _errs60 === errors;
}
else {
var valid19 = true;
}
if(valid19){
if(data22.participantSessionsStarted !== undefined){
let data25 = data22.participantSessionsStarted;
const _errs63 = errors;
const _errs64 = errors;
if(!((typeof data25 == "number") && (!(data25 % 1) && !isNaN(data25)))){
validate79.errors = [{instancePath:instancePath+"/totals/participantSessionsStarted",schemaPath:"common.json#/$defs/count/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs64){
if(typeof data25 == "number"){
if(data25 > 9007199254740991 || isNaN(data25)){
validate79.errors = [{instancePath:instancePath+"/totals/participantSessionsStarted",schemaPath:"common.json#/$defs/count/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data25 < 0 || isNaN(data25)){
validate79.errors = [{instancePath:instancePath+"/totals/participantSessionsStarted",schemaPath:"common.json#/$defs/count/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
}
var valid19 = _errs63 === errors;
}
else {
var valid19 = true;
}
if(valid19){
if(data22.observedParticipantMs !== undefined){
let data26 = data22.observedParticipantMs;
const _errs66 = errors;
const _errs67 = errors;
if(errors === _errs67){
if(typeof data26 == "number"){
if(data26 > 9007199254740991 || isNaN(data26)){
validate79.errors = [{instancePath:instancePath+"/totals/observedParticipantMs",schemaPath:"common.json#/$defs/durationMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data26 < 0 || isNaN(data26)){
validate79.errors = [{instancePath:instancePath+"/totals/observedParticipantMs",schemaPath:"common.json#/$defs/durationMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
else {
validate79.errors = [{instancePath:instancePath+"/totals/observedParticipantMs",schemaPath:"common.json#/$defs/durationMs/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid19 = _errs66 === errors;
}
else {
var valid19 = true;
}
if(valid19){
if(data22.connectedParticipantMs !== undefined){
const _errs69 = errors;
if(!(validate84(data22.connectedParticipantMs, {instancePath:instancePath+"/totals/connectedParticipantMs",parentData:data22,parentDataProperty:"connectedParticipantMs",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate84.errors : vErrors.concat(validate84.errors);
errors = vErrors.length;
}
var valid19 = _errs69 === errors;
}
else {
var valid19 = true;
}
if(valid19){
if(data22.callExposureMs !== undefined){
let data28 = data22.callExposureMs;
const _errs70 = errors;
const _errs71 = errors;
if(errors === _errs71){
if(typeof data28 == "number"){
if(data28 > 9007199254740991 || isNaN(data28)){
validate79.errors = [{instancePath:instancePath+"/totals/callExposureMs",schemaPath:"common.json#/$defs/durationMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data28 < 0 || isNaN(data28)){
validate79.errors = [{instancePath:instancePath+"/totals/callExposureMs",schemaPath:"common.json#/$defs/durationMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
else {
validate79.errors = [{instancePath:instancePath+"/totals/callExposureMs",schemaPath:"common.json#/$defs/durationMs/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid19 = _errs70 === errors;
}
else {
var valid19 = true;
}
if(valid19){
if(data22.largestCallPeakParticipants !== undefined){
const _errs73 = errors;
if(!(validate86(data22.largestCallPeakParticipants, {instancePath:instancePath+"/totals/largestCallPeakParticipants",parentData:data22,parentDataProperty:"largestCallPeakParticipants",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate86.errors : vErrors.concat(validate86.errors);
errors = vErrors.length;
}
var valid19 = _errs73 === errors;
}
else {
var valid19 = true;
}
}
}
}
}
}
}
}
}
}
else {
validate79.errors = [{instancePath:instancePath+"/totals",schemaPath:"#/properties/totals/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid7 = _errs54 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.joins !== undefined){
const _errs74 = errors;
if(!(validate88(data.joins, {instancePath:instancePath+"/joins",parentData:data,parentDataProperty:"joins",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate88.errors : vErrors.concat(validate88.errors);
errors = vErrors.length;
}
var valid7 = _errs74 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.impairments !== undefined){
const _errs75 = errors;
if(!(validate96(data.impairments, {instancePath:instancePath+"/impairments",parentData:data,parentDataProperty:"impairments",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate96.errors : vErrors.concat(validate96.errors);
errors = vErrors.length;
}
var valid7 = _errs75 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.metrics !== undefined){
const _errs76 = errors;
if(!(validate99(data.metrics, {instancePath:instancePath+"/metrics",parentData:data,parentDataProperty:"metrics",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate99.errors : vErrors.concat(validate99.errors);
errors = vErrors.length;
}
var valid7 = _errs76 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.findingCounts !== undefined){
const _errs77 = errors;
if(!(validate102(data.findingCounts, {instancePath:instancePath+"/findingCounts",parentData:data,parentDataProperty:"findingCounts",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate102.errors : vErrors.concat(validate102.errors);
errors = vErrors.length;
}
var valid7 = _errs77 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.cohorts !== undefined){
let data34 = data.cohorts;
const _errs78 = errors;
if(errors === _errs78){
if(Array.isArray(data34)){
if(data34.length > 2048){
validate79.errors = [{instancePath:instancePath+"/cohorts",schemaPath:"#/properties/cohorts/maxItems",keyword:"maxItems",params:{limit: 2048},message:"must NOT have more than 2048 items"}];
return false;
}
else {
var valid25 = true;
const len0 = data34.length;
for(let i0=0; i0<len0; i0++){
const _errs80 = errors;
if(!(validate105(data34[i0], {instancePath:instancePath+"/cohorts/" + i0,parentData:data34,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate105.errors : vErrors.concat(validate105.errors);
errors = vErrors.length;
}
var valid25 = _errs80 === errors;
if(!valid25){
break;
}
}
}
}
else {
validate79.errors = [{instancePath:instancePath+"/cohorts",schemaPath:"#/properties/cohorts/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid7 = _errs78 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.buckets !== undefined){
let data36 = data.buckets;
const _errs81 = errors;
if(errors === _errs81){
if(Array.isArray(data36)){
if(data36.length > 31){
validate79.errors = [{instancePath:instancePath+"/buckets",schemaPath:"#/properties/buckets/maxItems",keyword:"maxItems",params:{limit: 31},message:"must NOT have more than 31 items"}];
return false;
}
else {
var valid26 = true;
const len1 = data36.length;
for(let i1=0; i1<len1; i1++){
const _errs83 = errors;
if(!(validate109(data36[i1], {instancePath:instancePath+"/buckets/" + i1,parentData:data36,parentDataProperty:i1,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate109.errors : vErrors.concat(validate109.errors);
errors = vErrors.length;
}
var valid26 = _errs83 === errors;
if(!valid26){
break;
}
}
}
}
else {
validate79.errors = [{instancePath:instancePath+"/buckets",schemaPath:"#/properties/buckets/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid7 = _errs81 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.worstCalls !== undefined){
let data38 = data.worstCalls;
const _errs84 = errors;
if(errors === _errs84){
if(Array.isArray(data38)){
if(data38.length > 20){
validate79.errors = [{instancePath:instancePath+"/worstCalls",schemaPath:"#/properties/worstCalls/maxItems",keyword:"maxItems",params:{limit: 20},message:"must NOT have more than 20 items"}];
return false;
}
else {
var valid27 = true;
const len2 = data38.length;
for(let i2=0; i2<len2; i2++){
const _errs86 = errors;
if(!(validate113(data38[i2], {instancePath:instancePath+"/worstCalls/" + i2,parentData:data38,parentDataProperty:i2,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate113.errors : vErrors.concat(validate113.errors);
errors = vErrors.length;
}
var valid27 = _errs86 === errors;
if(!valid27){
break;
}
}
}
}
else {
validate79.errors = [{instancePath:instancePath+"/worstCalls",schemaPath:"#/properties/worstCalls/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid7 = _errs84 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.callSearchResourceId !== undefined){
let data40 = data.callSearchResourceId;
const _errs87 = errors;
const _errs88 = errors;
if(errors === _errs88){
if(typeof data40 === "string"){
if(func1(data40) > 512){
validate79.errors = [{instancePath:instancePath+"/callSearchResourceId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data40) < 1){
validate79.errors = [{instancePath:instancePath+"/callSearchResourceId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate79.errors = [{instancePath:instancePath+"/callSearchResourceId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid7 = _errs87 === errors;
}
else {
var valid7 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate79.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate79.errors = vErrors;
return errors === 0;
}
validate79.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const validateManifest = validate116;
const schema150 = {"type":"object","additionalProperties":true,"required":["schemaVersion","subject","currentRevision","digestKey","provenance"],"properties":{"schemaVersion":{"const":1},"subject":{"type":"object","additionalProperties":false,"required":["kind","id"],"properties":{"kind":{"enum":["call","day","month"]},"id":{"$ref":"common.json#/$defs/opaqueId"}}},"currentRevision":{"$ref":"common.json#/$defs/opaqueId"},"digestKey":{"type":"string","minLength":1,"maxLength":1024},"provenance":{"$ref":"common.json#/$defs/provenance"},"supersedes":{"oneOf":[{"$ref":"common.json#/$defs/opaqueId"},{"type":"null"}]}}};

function validate117(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate117.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.processorVersion === undefined) && (missing0 = "processorVersion")) || ((data.policyId === undefined) && (missing0 = "policyId"))) || ((data.sourceRevision === undefined) && (missing0 = "sourceRevision"))) || ((data.generatedAt === undefined) && (missing0 = "generatedAt"))){
validate117.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "processorVersion") || (key0 === "policyId")) || (key0 === "sourceRevision")) || (key0 === "generatedAt"))){
validate117.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.processorVersion !== undefined){
let data0 = data.processorVersion;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 512){
validate117.errors = [{instancePath:instancePath+"/processorVersion",schemaPath:"#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data0) < 1){
validate117.errors = [{instancePath:instancePath+"/processorVersion",schemaPath:"#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate117.errors = [{instancePath:instancePath+"/processorVersion",schemaPath:"#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.policyId !== undefined){
let data1 = data.policyId;
const _errs5 = errors;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data1 === "string"){
if(func1(data1) > 512){
validate117.errors = [{instancePath:instancePath+"/policyId",schemaPath:"#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data1) < 1){
validate117.errors = [{instancePath:instancePath+"/policyId",schemaPath:"#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate117.errors = [{instancePath:instancePath+"/policyId",schemaPath:"#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sourceRevision !== undefined){
let data2 = data.sourceRevision;
const _errs8 = errors;
const _errs9 = errors;
if(errors === _errs9){
if(typeof data2 === "string"){
if(func1(data2) > 512){
validate117.errors = [{instancePath:instancePath+"/sourceRevision",schemaPath:"#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data2) < 1){
validate117.errors = [{instancePath:instancePath+"/sourceRevision",schemaPath:"#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate117.errors = [{instancePath:instancePath+"/sourceRevision",schemaPath:"#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.generatedAt !== undefined){
let data3 = data.generatedAt;
const _errs11 = errors;
const _errs12 = errors;
if(!((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3)))){
validate117.errors = [{instancePath:instancePath+"/generatedAt",schemaPath:"#/$defs/epochMs/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs12){
if(typeof data3 == "number"){
if(data3 > 8640000000000000 || isNaN(data3)){
validate117.errors = [{instancePath:instancePath+"/generatedAt",schemaPath:"#/$defs/epochMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 8640000000000000},message:"must be <= 8640000000000000"}];
return false;
}
else {
if(data3 < -8640000000000000 || isNaN(data3)){
validate117.errors = [{instancePath:instancePath+"/generatedAt",schemaPath:"#/$defs/epochMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: -8640000000000000},message:"must be >= -8640000000000000"}];
return false;
}
}
}
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate117.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate117.errors = vErrors;
return errors === 0;
}
validate117.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate116(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate116.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.schemaVersion === undefined) && (missing0 = "schemaVersion")) || ((data.subject === undefined) && (missing0 = "subject"))) || ((data.currentRevision === undefined) && (missing0 = "currentRevision"))) || ((data.digestKey === undefined) && (missing0 = "digestKey"))) || ((data.provenance === undefined) && (missing0 = "provenance"))){
validate116.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.schemaVersion !== undefined){
const _errs2 = errors;
if(1 !== data.schemaVersion){
validate116.errors = [{instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.subject !== undefined){
let data1 = data.subject;
const _errs3 = errors;
if(errors === _errs3){
if(data1 && typeof data1 == "object" && !Array.isArray(data1)){
let missing1;
if(((data1.kind === undefined) && (missing1 = "kind")) || ((data1.id === undefined) && (missing1 = "id"))){
validate116.errors = [{instancePath:instancePath+"/subject",schemaPath:"#/properties/subject/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs5 = errors;
for(const key0 in data1){
if(!((key0 === "kind") || (key0 === "id"))){
validate116.errors = [{instancePath:instancePath+"/subject",schemaPath:"#/properties/subject/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs5 === errors){
if(data1.kind !== undefined){
let data2 = data1.kind;
const _errs6 = errors;
if(!(((data2 === "call") || (data2 === "day")) || (data2 === "month"))){
validate116.errors = [{instancePath:instancePath+"/subject/kind",schemaPath:"#/properties/subject/properties/kind/enum",keyword:"enum",params:{allowedValues: schema150.properties.subject.properties.kind.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid1 = _errs6 === errors;
}
else {
var valid1 = true;
}
if(valid1){
if(data1.id !== undefined){
let data3 = data1.id;
const _errs7 = errors;
const _errs8 = errors;
if(errors === _errs8){
if(typeof data3 === "string"){
if(func1(data3) > 512){
validate116.errors = [{instancePath:instancePath+"/subject/id",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data3) < 1){
validate116.errors = [{instancePath:instancePath+"/subject/id",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate116.errors = [{instancePath:instancePath+"/subject/id",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid1 = _errs7 === errors;
}
else {
var valid1 = true;
}
}
}
}
}
else {
validate116.errors = [{instancePath:instancePath+"/subject",schemaPath:"#/properties/subject/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.currentRevision !== undefined){
let data4 = data.currentRevision;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data4 === "string"){
if(func1(data4) > 512){
validate116.errors = [{instancePath:instancePath+"/currentRevision",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data4) < 1){
validate116.errors = [{instancePath:instancePath+"/currentRevision",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate116.errors = [{instancePath:instancePath+"/currentRevision",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.digestKey !== undefined){
let data5 = data.digestKey;
const _errs13 = errors;
if(errors === _errs13){
if(typeof data5 === "string"){
if(func1(data5) > 1024){
validate116.errors = [{instancePath:instancePath+"/digestKey",schemaPath:"#/properties/digestKey/maxLength",keyword:"maxLength",params:{limit: 1024},message:"must NOT have more than 1024 characters"}];
return false;
}
else {
if(func1(data5) < 1){
validate116.errors = [{instancePath:instancePath+"/digestKey",schemaPath:"#/properties/digestKey/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate116.errors = [{instancePath:instancePath+"/digestKey",schemaPath:"#/properties/digestKey/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.provenance !== undefined){
const _errs15 = errors;
if(!(validate117(data.provenance, {instancePath:instancePath+"/provenance",parentData:data,parentDataProperty:"provenance",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate117.errors : vErrors.concat(validate117.errors);
errors = vErrors.length;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.supersedes !== undefined){
let data7 = data.supersedes;
const _errs16 = errors;
const _errs17 = errors;
let valid4 = false;
let passing0 = null;
const _errs18 = errors;
const _errs19 = errors;
if(errors === _errs19){
if(typeof data7 === "string"){
if(func1(data7) > 512){
const err0 = {instancePath:instancePath+"/supersedes",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(func1(data7) < 1){
const err1 = {instancePath:instancePath+"/supersedes",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
else {
const err2 = {instancePath:instancePath+"/supersedes",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
var _valid0 = _errs18 === errors;
if(_valid0){
valid4 = true;
passing0 = 0;
}
const _errs21 = errors;
if(data7 !== null){
const err3 = {instancePath:instancePath+"/supersedes",schemaPath:"#/properties/supersedes/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
var _valid0 = _errs21 === errors;
if(_valid0 && valid4){
valid4 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid4 = true;
passing0 = 1;
}
}
if(!valid4){
const err4 = {instancePath:instancePath+"/supersedes",schemaPath:"#/properties/supersedes/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
validate116.errors = vErrors;
return false;
}
else {
errors = _errs17;
if(vErrors !== null){
if(_errs17){
vErrors.length = _errs17;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
else {
validate116.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate116.errors = vErrors;
return errors === 0;
}
validate116.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const validatePage = validate119;
const schema159 = {"type":"object","additionalProperties":false,"required":["revision","items","nextCursor"],"properties":{"revision":{"$ref":"common.json#/$defs/opaqueId"},"items":{"type":"array","maxItems":500},"nextCursor":{"oneOf":[{"type":"string","minLength":1,"maxLength":4096},{"type":"null"}]}}};

function validate119(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate119.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.revision === undefined) && (missing0 = "revision")) || ((data.items === undefined) && (missing0 = "items"))) || ((data.nextCursor === undefined) && (missing0 = "nextCursor"))){
validate119.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((key0 === "revision") || (key0 === "items")) || (key0 === "nextCursor"))){
validate119.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.revision !== undefined){
let data0 = data.revision;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 512){
validate119.errors = [{instancePath:instancePath+"/revision",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data0) < 1){
validate119.errors = [{instancePath:instancePath+"/revision",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate119.errors = [{instancePath:instancePath+"/revision",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.items !== undefined){
let data1 = data.items;
const _errs5 = errors;
if(errors === _errs5){
if(Array.isArray(data1)){
if(data1.length > 500){
validate119.errors = [{instancePath:instancePath+"/items",schemaPath:"#/properties/items/maxItems",keyword:"maxItems",params:{limit: 500},message:"must NOT have more than 500 items"}];
return false;
}
}
else {
validate119.errors = [{instancePath:instancePath+"/items",schemaPath:"#/properties/items/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.nextCursor !== undefined){
let data2 = data.nextCursor;
const _errs7 = errors;
const _errs8 = errors;
let valid2 = false;
let passing0 = null;
const _errs9 = errors;
if(errors === _errs9){
if(typeof data2 === "string"){
if(func1(data2) > 4096){
const err0 = {instancePath:instancePath+"/nextCursor",schemaPath:"#/properties/nextCursor/oneOf/0/maxLength",keyword:"maxLength",params:{limit: 4096},message:"must NOT have more than 4096 characters"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(func1(data2) < 1){
const err1 = {instancePath:instancePath+"/nextCursor",schemaPath:"#/properties/nextCursor/oneOf/0/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
else {
const err2 = {instancePath:instancePath+"/nextCursor",schemaPath:"#/properties/nextCursor/oneOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
var _valid0 = _errs9 === errors;
if(_valid0){
valid2 = true;
passing0 = 0;
}
const _errs11 = errors;
if(data2 !== null){
const err3 = {instancePath:instancePath+"/nextCursor",schemaPath:"#/properties/nextCursor/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
var _valid0 = _errs11 === errors;
if(_valid0 && valid2){
valid2 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid2 = true;
passing0 = 1;
}
}
if(!valid2){
const err4 = {instancePath:instancePath+"/nextCursor",schemaPath:"#/properties/nextCursor/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
validate119.errors = vErrors;
return false;
}
else {
errors = _errs8;
if(vErrors !== null){
if(_errs8){
vErrors.length = _errs8;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
else {
validate119.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate119.errors = vErrors;
return errors === 0;
}
validate119.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const validateCallSearchRow = validate120;
const schema161 = {"type":"object","additionalProperties":true,"required":["callId","roomId","digestRevision","startedAt","endedAt","observedParticipantMs","impairment","completeness"],"properties":{"callId":{"$ref":"common.json#/$defs/opaqueId"},"roomId":{"oneOf":[{"$ref":"common.json#/$defs/opaqueId"},{"type":"null"}]},"digestRevision":{"$ref":"common.json#/$defs/opaqueId"},"startedAt":{"oneOf":[{"$ref":"common.json#/$defs/epochMs"},{"type":"null"}]},"endedAt":{"oneOf":[{"$ref":"common.json#/$defs/epochMs"},{"type":"null"}]},"observedParticipantMs":{"$ref":"common.json#/$defs/durationMs"},"impairment":{"$ref":"common.json#/$defs/impairmentExposure"},"completeness":{"$ref":"common.json#/$defs/completeness"}}};

function validate121(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate121.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.category === undefined) && (missing0 = "category")) || ((data.assessedParticipantMs === undefined) && (missing0 = "assessedParticipantMs"))) || ((data.impairedParticipantMs === undefined) && (missing0 = "impairedParticipantMs"))) || ((data.unknownParticipantMs === undefined) && (missing0 = "unknownParticipantMs"))){
validate121.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "category") || (key0 === "assessedParticipantMs")) || (key0 === "impairedParticipantMs")) || (key0 === "unknownParticipantMs"))){
validate121.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.category !== undefined){
let data0 = data.category;
const _errs2 = errors;
if(!(((((data0 === "audio") || (data0 === "video")) || (data0 === "network")) || (data0 === "connectivity")) || (data0 === "any"))){
validate121.errors = [{instancePath:instancePath+"/category",schemaPath:"#/$defs/impairmentCategory/enum",keyword:"enum",params:{allowedValues: schema74.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.assessedParticipantMs !== undefined){
let data1 = data.assessedParticipantMs;
const _errs4 = errors;
const _errs5 = errors;
if(errors === _errs5){
if(typeof data1 == "number"){
if(data1 > 9007199254740991 || isNaN(data1)){
validate121.errors = [{instancePath:instancePath+"/assessedParticipantMs",schemaPath:"#/$defs/durationMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data1 < 0 || isNaN(data1)){
validate121.errors = [{instancePath:instancePath+"/assessedParticipantMs",schemaPath:"#/$defs/durationMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
else {
validate121.errors = [{instancePath:instancePath+"/assessedParticipantMs",schemaPath:"#/$defs/durationMs/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.impairedParticipantMs !== undefined){
let data2 = data.impairedParticipantMs;
const _errs7 = errors;
const _errs8 = errors;
if(errors === _errs8){
if(typeof data2 == "number"){
if(data2 > 9007199254740991 || isNaN(data2)){
validate121.errors = [{instancePath:instancePath+"/impairedParticipantMs",schemaPath:"#/$defs/durationMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data2 < 0 || isNaN(data2)){
validate121.errors = [{instancePath:instancePath+"/impairedParticipantMs",schemaPath:"#/$defs/durationMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
else {
validate121.errors = [{instancePath:instancePath+"/impairedParticipantMs",schemaPath:"#/$defs/durationMs/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.unknownParticipantMs !== undefined){
let data3 = data.unknownParticipantMs;
const _errs10 = errors;
const _errs11 = errors;
if(errors === _errs11){
if(typeof data3 == "number"){
if(data3 > 9007199254740991 || isNaN(data3)){
validate121.errors = [{instancePath:instancePath+"/unknownParticipantMs",schemaPath:"#/$defs/durationMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data3 < 0 || isNaN(data3)){
validate121.errors = [{instancePath:instancePath+"/unknownParticipantMs",schemaPath:"#/$defs/durationMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
else {
validate121.errors = [{instancePath:instancePath+"/unknownParticipantMs",schemaPath:"#/$defs/durationMs/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate121.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate121.errors = vErrors;
return errors === 0;
}
validate121.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate120(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate120.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((((data.callId === undefined) && (missing0 = "callId")) || ((data.roomId === undefined) && (missing0 = "roomId"))) || ((data.digestRevision === undefined) && (missing0 = "digestRevision"))) || ((data.startedAt === undefined) && (missing0 = "startedAt"))) || ((data.endedAt === undefined) && (missing0 = "endedAt"))) || ((data.observedParticipantMs === undefined) && (missing0 = "observedParticipantMs"))) || ((data.impairment === undefined) && (missing0 = "impairment"))) || ((data.completeness === undefined) && (missing0 = "completeness"))){
validate120.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.callId !== undefined){
let data0 = data.callId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 512){
validate120.errors = [{instancePath:instancePath+"/callId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data0) < 1){
validate120.errors = [{instancePath:instancePath+"/callId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate120.errors = [{instancePath:instancePath+"/callId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.roomId !== undefined){
let data1 = data.roomId;
const _errs5 = errors;
const _errs6 = errors;
let valid2 = false;
let passing0 = null;
const _errs7 = errors;
const _errs8 = errors;
if(errors === _errs8){
if(typeof data1 === "string"){
if(func1(data1) > 512){
const err0 = {instancePath:instancePath+"/roomId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(func1(data1) < 1){
const err1 = {instancePath:instancePath+"/roomId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
else {
const err2 = {instancePath:instancePath+"/roomId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
var _valid0 = _errs7 === errors;
if(_valid0){
valid2 = true;
passing0 = 0;
}
const _errs10 = errors;
if(data1 !== null){
const err3 = {instancePath:instancePath+"/roomId",schemaPath:"#/properties/roomId/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
var _valid0 = _errs10 === errors;
if(_valid0 && valid2){
valid2 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid2 = true;
passing0 = 1;
}
}
if(!valid2){
const err4 = {instancePath:instancePath+"/roomId",schemaPath:"#/properties/roomId/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
validate120.errors = vErrors;
return false;
}
else {
errors = _errs6;
if(vErrors !== null){
if(_errs6){
vErrors.length = _errs6;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.digestRevision !== undefined){
let data2 = data.digestRevision;
const _errs12 = errors;
const _errs13 = errors;
if(errors === _errs13){
if(typeof data2 === "string"){
if(func1(data2) > 512){
validate120.errors = [{instancePath:instancePath+"/digestRevision",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data2) < 1){
validate120.errors = [{instancePath:instancePath+"/digestRevision",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate120.errors = [{instancePath:instancePath+"/digestRevision",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.startedAt !== undefined){
let data3 = data.startedAt;
const _errs15 = errors;
const _errs16 = errors;
let valid5 = false;
let passing1 = null;
const _errs17 = errors;
const _errs18 = errors;
if(!((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3)))){
const err5 = {instancePath:instancePath+"/startedAt",schemaPath:"common.json#/$defs/epochMs/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(errors === _errs18){
if(typeof data3 == "number"){
if(data3 > 8640000000000000 || isNaN(data3)){
const err6 = {instancePath:instancePath+"/startedAt",schemaPath:"common.json#/$defs/epochMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 8640000000000000},message:"must be <= 8640000000000000"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
else {
if(data3 < -8640000000000000 || isNaN(data3)){
const err7 = {instancePath:instancePath+"/startedAt",schemaPath:"common.json#/$defs/epochMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: -8640000000000000},message:"must be >= -8640000000000000"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
}
}
var _valid1 = _errs17 === errors;
if(_valid1){
valid5 = true;
passing1 = 0;
}
const _errs20 = errors;
if(data3 !== null){
const err8 = {instancePath:instancePath+"/startedAt",schemaPath:"#/properties/startedAt/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
var _valid1 = _errs20 === errors;
if(_valid1 && valid5){
valid5 = false;
passing1 = [passing1, 1];
}
else {
if(_valid1){
valid5 = true;
passing1 = 1;
}
}
if(!valid5){
const err9 = {instancePath:instancePath+"/startedAt",schemaPath:"#/properties/startedAt/oneOf",keyword:"oneOf",params:{passingSchemas: passing1},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
validate120.errors = vErrors;
return false;
}
else {
errors = _errs16;
if(vErrors !== null){
if(_errs16){
vErrors.length = _errs16;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.endedAt !== undefined){
let data4 = data.endedAt;
const _errs22 = errors;
const _errs23 = errors;
let valid7 = false;
let passing2 = null;
const _errs24 = errors;
const _errs25 = errors;
if(!((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4)))){
const err10 = {instancePath:instancePath+"/endedAt",schemaPath:"common.json#/$defs/epochMs/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(errors === _errs25){
if(typeof data4 == "number"){
if(data4 > 8640000000000000 || isNaN(data4)){
const err11 = {instancePath:instancePath+"/endedAt",schemaPath:"common.json#/$defs/epochMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 8640000000000000},message:"must be <= 8640000000000000"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
else {
if(data4 < -8640000000000000 || isNaN(data4)){
const err12 = {instancePath:instancePath+"/endedAt",schemaPath:"common.json#/$defs/epochMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: -8640000000000000},message:"must be >= -8640000000000000"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
}
}
var _valid2 = _errs24 === errors;
if(_valid2){
valid7 = true;
passing2 = 0;
}
const _errs27 = errors;
if(data4 !== null){
const err13 = {instancePath:instancePath+"/endedAt",schemaPath:"#/properties/endedAt/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
var _valid2 = _errs27 === errors;
if(_valid2 && valid7){
valid7 = false;
passing2 = [passing2, 1];
}
else {
if(_valid2){
valid7 = true;
passing2 = 1;
}
}
if(!valid7){
const err14 = {instancePath:instancePath+"/endedAt",schemaPath:"#/properties/endedAt/oneOf",keyword:"oneOf",params:{passingSchemas: passing2},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
validate120.errors = vErrors;
return false;
}
else {
errors = _errs23;
if(vErrors !== null){
if(_errs23){
vErrors.length = _errs23;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs22 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.observedParticipantMs !== undefined){
let data5 = data.observedParticipantMs;
const _errs29 = errors;
const _errs30 = errors;
if(errors === _errs30){
if(typeof data5 == "number"){
if(data5 > 9007199254740991 || isNaN(data5)){
validate120.errors = [{instancePath:instancePath+"/observedParticipantMs",schemaPath:"common.json#/$defs/durationMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data5 < 0 || isNaN(data5)){
validate120.errors = [{instancePath:instancePath+"/observedParticipantMs",schemaPath:"common.json#/$defs/durationMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
else {
validate120.errors = [{instancePath:instancePath+"/observedParticipantMs",schemaPath:"common.json#/$defs/durationMs/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid0 = _errs29 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.impairment !== undefined){
const _errs32 = errors;
if(!(validate121(data.impairment, {instancePath:instancePath+"/impairment",parentData:data,parentDataProperty:"impairment",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate121.errors : vErrors.concat(validate121.errors);
errors = vErrors.length;
}
var valid0 = _errs32 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.completeness !== undefined){
let data7 = data.completeness;
const _errs33 = errors;
if(!(((data7 === "complete") || (data7 === "partial")) || (data7 === "unknown"))){
validate120.errors = [{instancePath:instancePath+"/completeness",schemaPath:"common.json#/$defs/completeness/enum",keyword:"enum",params:{allowedValues: schema47.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs33 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
else {
validate120.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate120.errors = vErrors;
return errors === 0;
}
validate120.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const validateReadResult = validate123;
const schema174 = {"type":"object","additionalProperties":false,"required":["state"],"properties":{"state":{"$ref":"common.json#/$defs/readState"},"revision":{"oneOf":[{"$ref":"common.json#/$defs/opaqueId"},{"type":"null"}]},"staleness":{"type":"object","additionalProperties":false,"required":["generatedAt","reasons"],"properties":{"generatedAt":{"$ref":"common.json#/$defs/epochMs"},"reasons":{"$ref":"common.json#/$defs/reasonCodes"}}},"reasons":{"$ref":"common.json#/$defs/reasonCodes"},"schemaVersion":{"type":"integer"},"document":{}},"allOf":[{"if":{"properties":{"state":{"const":"ready"}},"required":["state"]},"then":{"required":["revision","document"]}},{"if":{"properties":{"state":{"enum":["pending","not-found","unsupported-version","failed","forbidden"]}},"required":["state"]},"then":{"required":["reasons"],"properties":{"reasons":{"minItems":1}}}},{"if":{"properties":{"state":{"const":"unsupported-version"}},"required":["state"]},"then":{"required":["schemaVersion"]}}]};
const schema175 = {"enum":["ready","pending","not-found","unsupported-version","failed","forbidden"]};

function validate124(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate124.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(Array.isArray(data)){
if(data.length > 64){
validate124.errors = [{instancePath,schemaPath:"#/maxItems",keyword:"maxItems",params:{limit: 64},message:"must NOT have more than 64 items"}];
return false;
}
else {
var valid0 = true;
const len0 = data.length;
for(let i0=0; i0<len0; i0++){
let data0 = data[i0];
const _errs1 = errors;
const _errs2 = errors;
if(errors === _errs2){
if(typeof data0 === "string"){
if(func1(data0) > 128){
validate124.errors = [{instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/reasonCode/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"}];
return false;
}
else {
if(func1(data0) < 1){
validate124.errors = [{instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/reasonCode/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
else {
if(!pattern4.test(data0)){
validate124.errors = [{instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/reasonCode/pattern",keyword:"pattern",params:{pattern: "^[a-z0-9]+(?:[-.][a-z0-9]+)*$"},message:"must match pattern \""+"^[a-z0-9]+(?:[-.][a-z0-9]+)*$"+"\""}];
return false;
}
}
}
}
else {
validate124.errors = [{instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/reasonCode/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs1 === errors;
if(!valid0){
break;
}
}
}
}
else {
validate124.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
validate124.errors = vErrors;
return errors === 0;
}
validate124.evaluated = {"items":true,"dynamicProps":false,"dynamicItems":false};


function validate123(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate123.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs1 = errors;
const _errs2 = errors;
let valid1 = true;
const _errs3 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.state === undefined) && (missing0 = "state")){
const err0 = {};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(data.state !== undefined){
if("ready" !== data.state){
const err1 = {};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
}
var _valid0 = _errs3 === errors;
errors = _errs2;
if(vErrors !== null){
if(_errs2){
vErrors.length = _errs2;
}
else {
vErrors = null;
}
}
if(_valid0){
const _errs5 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing1;
if(((data.revision === undefined) && (missing1 = "revision")) || ((data.document === undefined) && (missing1 = "document"))){
validate123.errors = [{instancePath,schemaPath:"#/allOf/0/then/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
}
var _valid0 = _errs5 === errors;
valid1 = _valid0;
}
if(!valid1){
const err2 = {instancePath,schemaPath:"#/allOf/0/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
validate123.errors = vErrors;
return false;
}
var valid0 = _errs1 === errors;
if(valid0){
const _errs6 = errors;
const _errs7 = errors;
let valid3 = true;
const _errs8 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing2;
if((data.state === undefined) && (missing2 = "state")){
const err3 = {};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
else {
if(data.state !== undefined){
let data1 = data.state;
if(!(((((data1 === "pending") || (data1 === "not-found")) || (data1 === "unsupported-version")) || (data1 === "failed")) || (data1 === "forbidden"))){
const err4 = {};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
}
}
var _valid1 = _errs8 === errors;
errors = _errs7;
if(vErrors !== null){
if(_errs7){
vErrors.length = _errs7;
}
else {
vErrors = null;
}
}
if(_valid1){
const _errs10 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing3;
if((data.reasons === undefined) && (missing3 = "reasons")){
validate123.errors = [{instancePath,schemaPath:"#/allOf/1/then/required",keyword:"required",params:{missingProperty: missing3},message:"must have required property '"+missing3+"'"}];
return false;
}
else {
if(data.reasons !== undefined){
let data2 = data.reasons;
if(Array.isArray(data2)){
if(data2.length < 1){
validate123.errors = [{instancePath:instancePath+"/reasons",schemaPath:"#/allOf/1/then/properties/reasons/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"}];
return false;
}
}
}
}
}
var _valid1 = _errs10 === errors;
valid3 = _valid1;
if(valid3){
var props0 = {};
props0.reasons = true;
props0.state = true;
}
}
if(!valid3){
const err5 = {instancePath,schemaPath:"#/allOf/1/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
validate123.errors = vErrors;
return false;
}
var valid0 = _errs6 === errors;
if(valid0){
if(props0 !== true){
props0 = props0 || {};
props0.state = true;
}
const _errs12 = errors;
const _errs13 = errors;
let valid6 = true;
const _errs14 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing4;
if((data.state === undefined) && (missing4 = "state")){
const err6 = {};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
else {
if(data.state !== undefined){
if("unsupported-version" !== data.state){
const err7 = {};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
}
}
var _valid2 = _errs14 === errors;
errors = _errs13;
if(vErrors !== null){
if(_errs13){
vErrors.length = _errs13;
}
else {
vErrors = null;
}
}
if(_valid2){
const _errs16 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing5;
if((data.schemaVersion === undefined) && (missing5 = "schemaVersion")){
validate123.errors = [{instancePath,schemaPath:"#/allOf/2/then/required",keyword:"required",params:{missingProperty: missing5},message:"must have required property '"+missing5+"'"}];
return false;
}
}
var _valid2 = _errs16 === errors;
valid6 = _valid2;
}
if(!valid6){
const err8 = {instancePath,schemaPath:"#/allOf/2/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
validate123.errors = vErrors;
return false;
}
var valid0 = _errs12 === errors;
if(valid0){
if(props0 !== true){
props0 = props0 || {};
props0.state = true;
}
}
}
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing6;
if((data.state === undefined) && (missing6 = "state")){
validate123.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing6},message:"must have required property '"+missing6+"'"}];
return false;
}
else {
const _errs17 = errors;
for(const key0 in data){
if(!((((((key0 === "state") || (key0 === "revision")) || (key0 === "staleness")) || (key0 === "reasons")) || (key0 === "schemaVersion")) || (key0 === "document"))){
validate123.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs17 === errors){
if(data.state !== undefined){
let data4 = data.state;
const _errs18 = errors;
if(!((((((data4 === "ready") || (data4 === "pending")) || (data4 === "not-found")) || (data4 === "unsupported-version")) || (data4 === "failed")) || (data4 === "forbidden"))){
validate123.errors = [{instancePath:instancePath+"/state",schemaPath:"common.json#/$defs/readState/enum",keyword:"enum",params:{allowedValues: schema175.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid8 = _errs18 === errors;
}
else {
var valid8 = true;
}
if(valid8){
if(data.revision !== undefined){
let data5 = data.revision;
const _errs20 = errors;
const _errs21 = errors;
let valid10 = false;
let passing0 = null;
const _errs22 = errors;
const _errs23 = errors;
if(errors === _errs23){
if(typeof data5 === "string"){
if(func1(data5) > 512){
const err9 = {instancePath:instancePath+"/revision",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
else {
if(func1(data5) < 1){
const err10 = {instancePath:instancePath+"/revision",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
}
else {
const err11 = {instancePath:instancePath+"/revision",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
var _valid3 = _errs22 === errors;
if(_valid3){
valid10 = true;
passing0 = 0;
}
const _errs25 = errors;
if(data5 !== null){
const err12 = {instancePath:instancePath+"/revision",schemaPath:"#/properties/revision/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
var _valid3 = _errs25 === errors;
if(_valid3 && valid10){
valid10 = false;
passing0 = [passing0, 1];
}
else {
if(_valid3){
valid10 = true;
passing0 = 1;
}
}
if(!valid10){
const err13 = {instancePath:instancePath+"/revision",schemaPath:"#/properties/revision/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
validate123.errors = vErrors;
return false;
}
else {
errors = _errs21;
if(vErrors !== null){
if(_errs21){
vErrors.length = _errs21;
}
else {
vErrors = null;
}
}
}
var valid8 = _errs20 === errors;
}
else {
var valid8 = true;
}
if(valid8){
if(data.staleness !== undefined){
let data6 = data.staleness;
const _errs27 = errors;
if(errors === _errs27){
if(data6 && typeof data6 == "object" && !Array.isArray(data6)){
let missing7;
if(((data6.generatedAt === undefined) && (missing7 = "generatedAt")) || ((data6.reasons === undefined) && (missing7 = "reasons"))){
validate123.errors = [{instancePath:instancePath+"/staleness",schemaPath:"#/properties/staleness/required",keyword:"required",params:{missingProperty: missing7},message:"must have required property '"+missing7+"'"}];
return false;
}
else {
const _errs29 = errors;
for(const key1 in data6){
if(!((key1 === "generatedAt") || (key1 === "reasons"))){
validate123.errors = [{instancePath:instancePath+"/staleness",schemaPath:"#/properties/staleness/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs29 === errors){
if(data6.generatedAt !== undefined){
let data7 = data6.generatedAt;
const _errs30 = errors;
const _errs31 = errors;
if(!((typeof data7 == "number") && (!(data7 % 1) && !isNaN(data7)))){
validate123.errors = [{instancePath:instancePath+"/staleness/generatedAt",schemaPath:"common.json#/$defs/epochMs/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs31){
if(typeof data7 == "number"){
if(data7 > 8640000000000000 || isNaN(data7)){
validate123.errors = [{instancePath:instancePath+"/staleness/generatedAt",schemaPath:"common.json#/$defs/epochMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 8640000000000000},message:"must be <= 8640000000000000"}];
return false;
}
else {
if(data7 < -8640000000000000 || isNaN(data7)){
validate123.errors = [{instancePath:instancePath+"/staleness/generatedAt",schemaPath:"common.json#/$defs/epochMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: -8640000000000000},message:"must be >= -8640000000000000"}];
return false;
}
}
}
}
var valid12 = _errs30 === errors;
}
else {
var valid12 = true;
}
if(valid12){
if(data6.reasons !== undefined){
const _errs33 = errors;
if(!(validate124(data6.reasons, {instancePath:instancePath+"/staleness/reasons",parentData:data6,parentDataProperty:"reasons",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate124.errors : vErrors.concat(validate124.errors);
errors = vErrors.length;
}
var valid12 = _errs33 === errors;
}
else {
var valid12 = true;
}
}
}
}
}
else {
validate123.errors = [{instancePath:instancePath+"/staleness",schemaPath:"#/properties/staleness/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid8 = _errs27 === errors;
}
else {
var valid8 = true;
}
if(valid8){
if(data.reasons !== undefined){
const _errs34 = errors;
if(!(validate124(data.reasons, {instancePath:instancePath+"/reasons",parentData:data,parentDataProperty:"reasons",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate124.errors : vErrors.concat(validate124.errors);
errors = vErrors.length;
}
var valid8 = _errs34 === errors;
}
else {
var valid8 = true;
}
if(valid8){
if(data.schemaVersion !== undefined){
let data10 = data.schemaVersion;
const _errs35 = errors;
if(!((typeof data10 == "number") && (!(data10 % 1) && !isNaN(data10)))){
validate123.errors = [{instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
var valid8 = _errs35 === errors;
}
else {
var valid8 = true;
}
}
}
}
}
}
}
}
else {
validate123.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate123.errors = vErrors;
return errors === 0;
}
validate123.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const validateParticipantDigest = validate128;
const schema181 = {"type":"object","additionalProperties":true,"required":["participantId","clientId","instanceId","displayName","membership","dimensions","capabilities","observedDurationMs","metrics","impairments"],"properties":{"participantId":{"$ref":"common.json#/$defs/opaqueId"},"clientId":{"$ref":"common.json#/$defs/opaqueId"},"instanceId":{"$ref":"common.json#/$defs/opaqueId"},"displayName":{"oneOf":[{"type":"string","maxLength":512},{"type":"null"}]},"membership":{"type":"array","items":{"$ref":"common.json#/$defs/timeRange"},"maxItems":512},"dimensions":{"type":"object","additionalProperties":false,"propertyNames":{"$ref":"common.json#/$defs/dimension"},"patternProperties":{"^.*$":{"oneOf":[{"type":"string","maxLength":256},{"type":"null"}]}}},"capabilities":{"$ref":"common.json#/$defs/capabilityMap"},"observedDurationMs":{"$ref":"common.json#/$defs/durationMs"},"metrics":{"$ref":"common.json#/$defs/metricAggregates"},"impairments":{"$ref":"common.json#/$defs/impairmentExposures"}}};

function validate129(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate129.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.startAt === undefined) && (missing0 = "startAt")) || ((data.endAt === undefined) && (missing0 = "endAt"))){
validate129.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((key0 === "startAt") || (key0 === "endAt"))){
validate129.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.startAt !== undefined){
let data0 = data.startAt;
const _errs2 = errors;
const _errs3 = errors;
if(!((typeof data0 == "number") && (!(data0 % 1) && !isNaN(data0)))){
validate129.errors = [{instancePath:instancePath+"/startAt",schemaPath:"#/$defs/epochMs/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs3){
if(typeof data0 == "number"){
if(data0 > 8640000000000000 || isNaN(data0)){
validate129.errors = [{instancePath:instancePath+"/startAt",schemaPath:"#/$defs/epochMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 8640000000000000},message:"must be <= 8640000000000000"}];
return false;
}
else {
if(data0 < -8640000000000000 || isNaN(data0)){
validate129.errors = [{instancePath:instancePath+"/startAt",schemaPath:"#/$defs/epochMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: -8640000000000000},message:"must be >= -8640000000000000"}];
return false;
}
}
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.endAt !== undefined){
let data1 = data.endAt;
const _errs5 = errors;
const _errs6 = errors;
if(!((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1)))){
validate129.errors = [{instancePath:instancePath+"/endAt",schemaPath:"#/$defs/epochMs/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs6){
if(typeof data1 == "number"){
if(data1 > 8640000000000000 || isNaN(data1)){
validate129.errors = [{instancePath:instancePath+"/endAt",schemaPath:"#/$defs/epochMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 8640000000000000},message:"must be <= 8640000000000000"}];
return false;
}
else {
if(data1 < -8640000000000000 || isNaN(data1)){
validate129.errors = [{instancePath:instancePath+"/endAt",schemaPath:"#/$defs/epochMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: -8640000000000000},message:"must be >= -8640000000000000"}];
return false;
}
}
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
else {
validate129.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate129.errors = vErrors;
return errors === 0;
}
validate129.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate131(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate131.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
for(const key0 in data){
const _errs1 = errors;
if(errors === _errs1){
if(typeof key0 === "string"){
if(func1(key0) > 64){
const err0 = {instancePath,schemaPath:"#/propertyNames/maxLength",keyword:"maxLength",params:{limit: 64},message:"must NOT have more than 64 characters",propertyName:key0};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(func1(key0) < 1){
const err1 = {instancePath,schemaPath:"#/propertyNames/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters",propertyName:key0};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
else {
const err2 = {instancePath,schemaPath:"#/propertyNames/type",keyword:"type",params:{type: "string"},message:"must be string",propertyName:key0};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
var valid0 = _errs1 === errors;
if(!valid0){
const err3 = {instancePath,schemaPath:"#/propertyNames",keyword:"propertyNames",params:{propertyName: key0},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
validate131.errors = vErrors;
return false;
break;
}
}
if(valid0){
for(const key1 in data){
const _errs4 = errors;
if(!(validate35(data[key1], {instancePath:instancePath+"/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"),parentData:data,parentDataProperty:key1,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate35.errors : vErrors.concat(validate35.errors);
errors = vErrors.length;
}
var valid1 = _errs4 === errors;
if(!valid1){
break;
}
}
}
}
else {
validate131.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate131.errors = vErrors;
return errors === 0;
}
validate131.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate134(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate134.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(Array.isArray(data)){
if(data.length > 512){
validate134.errors = [{instancePath,schemaPath:"#/maxItems",keyword:"maxItems",params:{limit: 512},message:"must NOT have more than 512 items"}];
return false;
}
else {
var valid0 = true;
const len0 = data.length;
for(let i0=0; i0<len0; i0++){
const _errs1 = errors;
if(!(validate60(data[i0], {instancePath:instancePath+"/" + i0,parentData:data,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate60.errors : vErrors.concat(validate60.errors);
errors = vErrors.length;
}
var valid0 = _errs1 === errors;
if(!valid0){
break;
}
}
}
}
else {
validate134.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
validate134.errors = vErrors;
return errors === 0;
}
validate134.evaluated = {"items":true,"dynamicProps":false,"dynamicItems":false};


function validate137(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate137.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(Array.isArray(data)){
if(data.length > 5){
validate137.errors = [{instancePath,schemaPath:"#/maxItems",keyword:"maxItems",params:{limit: 5},message:"must NOT have more than 5 items"}];
return false;
}
else {
var valid0 = true;
const len0 = data.length;
for(let i0=0; i0<len0; i0++){
const _errs1 = errors;
if(!(validate56(data[i0], {instancePath:instancePath+"/" + i0,parentData:data,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
errors = vErrors.length;
}
var valid0 = _errs1 === errors;
if(!valid0){
break;
}
}
}
}
else {
validate137.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
validate137.errors = vErrors;
return errors === 0;
}
validate137.evaluated = {"items":true,"dynamicProps":false,"dynamicItems":false};

const pattern9 = new RegExp("^.*$", "u");

function validate128(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate128.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((((((data.participantId === undefined) && (missing0 = "participantId")) || ((data.clientId === undefined) && (missing0 = "clientId"))) || ((data.instanceId === undefined) && (missing0 = "instanceId"))) || ((data.displayName === undefined) && (missing0 = "displayName"))) || ((data.membership === undefined) && (missing0 = "membership"))) || ((data.dimensions === undefined) && (missing0 = "dimensions"))) || ((data.capabilities === undefined) && (missing0 = "capabilities"))) || ((data.observedDurationMs === undefined) && (missing0 = "observedDurationMs"))) || ((data.metrics === undefined) && (missing0 = "metrics"))) || ((data.impairments === undefined) && (missing0 = "impairments"))){
validate128.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.participantId !== undefined){
let data0 = data.participantId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 512){
validate128.errors = [{instancePath:instancePath+"/participantId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data0) < 1){
validate128.errors = [{instancePath:instancePath+"/participantId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate128.errors = [{instancePath:instancePath+"/participantId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.clientId !== undefined){
let data1 = data.clientId;
const _errs5 = errors;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data1 === "string"){
if(func1(data1) > 512){
validate128.errors = [{instancePath:instancePath+"/clientId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data1) < 1){
validate128.errors = [{instancePath:instancePath+"/clientId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate128.errors = [{instancePath:instancePath+"/clientId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.instanceId !== undefined){
let data2 = data.instanceId;
const _errs8 = errors;
const _errs9 = errors;
if(errors === _errs9){
if(typeof data2 === "string"){
if(func1(data2) > 512){
validate128.errors = [{instancePath:instancePath+"/instanceId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data2) < 1){
validate128.errors = [{instancePath:instancePath+"/instanceId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate128.errors = [{instancePath:instancePath+"/instanceId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.displayName !== undefined){
let data3 = data.displayName;
const _errs11 = errors;
const _errs12 = errors;
let valid4 = false;
let passing0 = null;
const _errs13 = errors;
if(errors === _errs13){
if(typeof data3 === "string"){
if(func1(data3) > 512){
const err0 = {instancePath:instancePath+"/displayName",schemaPath:"#/properties/displayName/oneOf/0/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
}
else {
const err1 = {instancePath:instancePath+"/displayName",schemaPath:"#/properties/displayName/oneOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
var _valid0 = _errs13 === errors;
if(_valid0){
valid4 = true;
passing0 = 0;
}
const _errs15 = errors;
if(data3 !== null){
const err2 = {instancePath:instancePath+"/displayName",schemaPath:"#/properties/displayName/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
var _valid0 = _errs15 === errors;
if(_valid0 && valid4){
valid4 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid4 = true;
passing0 = 1;
}
}
if(!valid4){
const err3 = {instancePath:instancePath+"/displayName",schemaPath:"#/properties/displayName/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
validate128.errors = vErrors;
return false;
}
else {
errors = _errs12;
if(vErrors !== null){
if(_errs12){
vErrors.length = _errs12;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.membership !== undefined){
let data4 = data.membership;
const _errs17 = errors;
if(errors === _errs17){
if(Array.isArray(data4)){
if(data4.length > 512){
validate128.errors = [{instancePath:instancePath+"/membership",schemaPath:"#/properties/membership/maxItems",keyword:"maxItems",params:{limit: 512},message:"must NOT have more than 512 items"}];
return false;
}
else {
var valid5 = true;
const len0 = data4.length;
for(let i0=0; i0<len0; i0++){
const _errs19 = errors;
if(!(validate129(data4[i0], {instancePath:instancePath+"/membership/" + i0,parentData:data4,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate129.errors : vErrors.concat(validate129.errors);
errors = vErrors.length;
}
var valid5 = _errs19 === errors;
if(!valid5){
break;
}
}
}
}
else {
validate128.errors = [{instancePath:instancePath+"/membership",schemaPath:"#/properties/membership/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.dimensions !== undefined){
let data6 = data.dimensions;
const _errs20 = errors;
if(errors === _errs20){
if(data6 && typeof data6 == "object" && !Array.isArray(data6)){
for(const key0 in data6){
const _errs22 = errors;
if(!(((((((((key0 === "browser") || (key0 === "browserMajorVersion")) || (key0 === "os")) || (key0 === "appVersion")) || (key0 === "sdkVersion")) || (key0 === "producer")) || (key0 === "region")) || (key0 === "sfuId")) || (key0 === "turnServer"))){
const err4 = {instancePath:instancePath+"/dimensions",schemaPath:"common.json#/$defs/dimension/enum",keyword:"enum",params:{allowedValues: schema134.enum},message:"must be equal to one of the allowed values",propertyName:key0};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
var valid6 = _errs22 === errors;
if(!valid6){
const err5 = {instancePath:instancePath+"/dimensions",schemaPath:"#/properties/dimensions/propertyNames",keyword:"propertyNames",params:{propertyName: key0},message:"property name must be valid"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
validate128.errors = vErrors;
return false;
break;
}
}
if(valid6){
const _errs24 = errors;
for(const key1 in data6){
if(!(pattern9.test(key1))){
validate128.errors = [{instancePath:instancePath+"/dimensions",schemaPath:"#/properties/dimensions/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs24 === errors){
var valid8 = true;
for(const key2 in data6){
if(pattern9.test(key2)){
let data7 = data6[key2];
const _errs25 = errors;
const _errs26 = errors;
let valid9 = false;
let passing1 = null;
const _errs27 = errors;
if(errors === _errs27){
if(typeof data7 === "string"){
if(func1(data7) > 256){
const err6 = {instancePath:instancePath+"/dimensions/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/dimensions/patternProperties/%5E.*%24/oneOf/0/maxLength",keyword:"maxLength",params:{limit: 256},message:"must NOT have more than 256 characters"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
else {
const err7 = {instancePath:instancePath+"/dimensions/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/dimensions/patternProperties/%5E.*%24/oneOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
var _valid1 = _errs27 === errors;
if(_valid1){
valid9 = true;
passing1 = 0;
}
const _errs29 = errors;
if(data7 !== null){
const err8 = {instancePath:instancePath+"/dimensions/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/dimensions/patternProperties/%5E.*%24/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
var _valid1 = _errs29 === errors;
if(_valid1 && valid9){
valid9 = false;
passing1 = [passing1, 1];
}
else {
if(_valid1){
valid9 = true;
passing1 = 1;
}
}
if(!valid9){
const err9 = {instancePath:instancePath+"/dimensions/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/dimensions/patternProperties/%5E.*%24/oneOf",keyword:"oneOf",params:{passingSchemas: passing1},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
validate128.errors = vErrors;
return false;
}
else {
errors = _errs26;
if(vErrors !== null){
if(_errs26){
vErrors.length = _errs26;
}
else {
vErrors = null;
}
}
}
var valid8 = _errs25 === errors;
if(!valid8){
break;
}
}
}
}
}
}
else {
validate128.errors = [{instancePath:instancePath+"/dimensions",schemaPath:"#/properties/dimensions/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs20 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.capabilities !== undefined){
const _errs31 = errors;
if(!(validate131(data.capabilities, {instancePath:instancePath+"/capabilities",parentData:data,parentDataProperty:"capabilities",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate131.errors : vErrors.concat(validate131.errors);
errors = vErrors.length;
}
var valid0 = _errs31 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.observedDurationMs !== undefined){
let data9 = data.observedDurationMs;
const _errs32 = errors;
const _errs33 = errors;
if(errors === _errs33){
if(typeof data9 == "number"){
if(data9 > 9007199254740991 || isNaN(data9)){
validate128.errors = [{instancePath:instancePath+"/observedDurationMs",schemaPath:"common.json#/$defs/durationMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data9 < 0 || isNaN(data9)){
validate128.errors = [{instancePath:instancePath+"/observedDurationMs",schemaPath:"common.json#/$defs/durationMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
else {
validate128.errors = [{instancePath:instancePath+"/observedDurationMs",schemaPath:"common.json#/$defs/durationMs/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid0 = _errs32 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.metrics !== undefined){
const _errs35 = errors;
if(!(validate134(data.metrics, {instancePath:instancePath+"/metrics",parentData:data,parentDataProperty:"metrics",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate134.errors : vErrors.concat(validate134.errors);
errors = vErrors.length;
}
var valid0 = _errs35 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.impairments !== undefined){
const _errs36 = errors;
if(!(validate137(data.impairments, {instancePath:instancePath+"/impairments",parentData:data,parentDataProperty:"impairments",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate137.errors : vErrors.concat(validate137.errors);
errors = vErrors.length;
}
var valid0 = _errs36 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate128.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate128.errors = vErrors;
return errors === 0;
}
validate128.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const validateStreamDigest = validate140;
const schema193 = {"type":"object","additionalProperties":true,"required":["streamId","participantId","peerConnectionId","trackId","encodingId","direction","mediaKind","epoch","publisherStreamId","relationshipSource","metrics"],"properties":{"streamId":{"$ref":"common.json#/$defs/opaqueId"},"participantId":{"$ref":"common.json#/$defs/opaqueId"},"peerConnectionId":{"$ref":"common.json#/$defs/opaqueId"},"trackId":{"oneOf":[{"$ref":"common.json#/$defs/opaqueId"},{"type":"null"}]},"encodingId":{"oneOf":[{"$ref":"common.json#/$defs/opaqueId"},{"type":"null"}]},"direction":{"enum":["inbound","outbound"]},"mediaKind":{"enum":["audio","video"]},"epoch":{"$ref":"common.json#/$defs/opaqueId"},"publisherStreamId":{"oneOf":[{"$ref":"common.json#/$defs/opaqueId"},{"type":"null"}]},"relationshipSource":{"oneOf":[{"$ref":"common.json#/$defs/reasonCode"},{"type":"null"}]},"metrics":{"$ref":"common.json#/$defs/metricAggregates"}},"allOf":[{"if":{"properties":{"publisherStreamId":{"type":"null"}},"required":["publisherStreamId"]},"then":{"properties":{"relationshipSource":{"type":"null"}}}},{"if":{"properties":{"publisherStreamId":{"type":"string"}},"required":["publisherStreamId"]},"then":{"properties":{"relationshipSource":{"type":"string"}}}}]};

function validate140(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate140.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs1 = errors;
const _errs2 = errors;
let valid1 = true;
const _errs3 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.publisherStreamId === undefined) && (missing0 = "publisherStreamId")){
const err0 = {};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(data.publisherStreamId !== undefined){
if(data.publisherStreamId !== null){
const err1 = {};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
}
var _valid0 = _errs3 === errors;
errors = _errs2;
if(vErrors !== null){
if(_errs2){
vErrors.length = _errs2;
}
else {
vErrors = null;
}
}
if(_valid0){
const _errs6 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.relationshipSource !== undefined){
if(data.relationshipSource !== null){
validate140.errors = [{instancePath:instancePath+"/relationshipSource",schemaPath:"#/allOf/0/then/properties/relationshipSource/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
}
}
var _valid0 = _errs6 === errors;
valid1 = _valid0;
if(valid1){
var props0 = {};
props0.relationshipSource = true;
props0.publisherStreamId = true;
}
}
if(!valid1){
const err2 = {instancePath,schemaPath:"#/allOf/0/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
validate140.errors = vErrors;
return false;
}
var valid0 = _errs1 === errors;
if(valid0){
const _errs9 = errors;
const _errs10 = errors;
let valid4 = true;
const _errs11 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing1;
if((data.publisherStreamId === undefined) && (missing1 = "publisherStreamId")){
const err3 = {};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
else {
if(data.publisherStreamId !== undefined){
if(typeof data.publisherStreamId !== "string"){
const err4 = {};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
}
}
var _valid1 = _errs11 === errors;
errors = _errs10;
if(vErrors !== null){
if(_errs10){
vErrors.length = _errs10;
}
else {
vErrors = null;
}
}
if(_valid1){
const _errs14 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.relationshipSource !== undefined){
if(typeof data.relationshipSource !== "string"){
validate140.errors = [{instancePath:instancePath+"/relationshipSource",schemaPath:"#/allOf/1/then/properties/relationshipSource/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var _valid1 = _errs14 === errors;
valid4 = _valid1;
if(valid4){
var props1 = {};
props1.relationshipSource = true;
props1.publisherStreamId = true;
}
}
if(!valid4){
const err5 = {instancePath,schemaPath:"#/allOf/1/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
validate140.errors = vErrors;
return false;
}
var valid0 = _errs9 === errors;
if(valid0){
if(props0 !== true && props1 !== undefined){
if(props1 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props1);
}
}
}
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing2;
if((((((((((((data.streamId === undefined) && (missing2 = "streamId")) || ((data.participantId === undefined) && (missing2 = "participantId"))) || ((data.peerConnectionId === undefined) && (missing2 = "peerConnectionId"))) || ((data.trackId === undefined) && (missing2 = "trackId"))) || ((data.encodingId === undefined) && (missing2 = "encodingId"))) || ((data.direction === undefined) && (missing2 = "direction"))) || ((data.mediaKind === undefined) && (missing2 = "mediaKind"))) || ((data.epoch === undefined) && (missing2 = "epoch"))) || ((data.publisherStreamId === undefined) && (missing2 = "publisherStreamId"))) || ((data.relationshipSource === undefined) && (missing2 = "relationshipSource"))) || ((data.metrics === undefined) && (missing2 = "metrics"))){
validate140.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing2},message:"must have required property '"+missing2+"'"}];
return false;
}
else {
if(data.streamId !== undefined){
let data4 = data.streamId;
const _errs18 = errors;
const _errs19 = errors;
if(errors === _errs19){
if(typeof data4 === "string"){
if(func1(data4) > 512){
validate140.errors = [{instancePath:instancePath+"/streamId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data4) < 1){
validate140.errors = [{instancePath:instancePath+"/streamId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate140.errors = [{instancePath:instancePath+"/streamId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid7 = _errs18 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.participantId !== undefined){
let data5 = data.participantId;
const _errs21 = errors;
const _errs22 = errors;
if(errors === _errs22){
if(typeof data5 === "string"){
if(func1(data5) > 512){
validate140.errors = [{instancePath:instancePath+"/participantId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data5) < 1){
validate140.errors = [{instancePath:instancePath+"/participantId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate140.errors = [{instancePath:instancePath+"/participantId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid7 = _errs21 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.peerConnectionId !== undefined){
let data6 = data.peerConnectionId;
const _errs24 = errors;
const _errs25 = errors;
if(errors === _errs25){
if(typeof data6 === "string"){
if(func1(data6) > 512){
validate140.errors = [{instancePath:instancePath+"/peerConnectionId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data6) < 1){
validate140.errors = [{instancePath:instancePath+"/peerConnectionId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate140.errors = [{instancePath:instancePath+"/peerConnectionId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid7 = _errs24 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.trackId !== undefined){
let data7 = data.trackId;
const _errs27 = errors;
const _errs28 = errors;
let valid11 = false;
let passing0 = null;
const _errs29 = errors;
const _errs30 = errors;
if(errors === _errs30){
if(typeof data7 === "string"){
if(func1(data7) > 512){
const err6 = {instancePath:instancePath+"/trackId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
else {
if(func1(data7) < 1){
const err7 = {instancePath:instancePath+"/trackId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
}
else {
const err8 = {instancePath:instancePath+"/trackId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
var _valid2 = _errs29 === errors;
if(_valid2){
valid11 = true;
passing0 = 0;
}
const _errs32 = errors;
if(data7 !== null){
const err9 = {instancePath:instancePath+"/trackId",schemaPath:"#/properties/trackId/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
var _valid2 = _errs32 === errors;
if(_valid2 && valid11){
valid11 = false;
passing0 = [passing0, 1];
}
else {
if(_valid2){
valid11 = true;
passing0 = 1;
}
}
if(!valid11){
const err10 = {instancePath:instancePath+"/trackId",schemaPath:"#/properties/trackId/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
validate140.errors = vErrors;
return false;
}
else {
errors = _errs28;
if(vErrors !== null){
if(_errs28){
vErrors.length = _errs28;
}
else {
vErrors = null;
}
}
}
var valid7 = _errs27 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.encodingId !== undefined){
let data8 = data.encodingId;
const _errs34 = errors;
const _errs35 = errors;
let valid13 = false;
let passing1 = null;
const _errs36 = errors;
const _errs37 = errors;
if(errors === _errs37){
if(typeof data8 === "string"){
if(func1(data8) > 512){
const err11 = {instancePath:instancePath+"/encodingId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
else {
if(func1(data8) < 1){
const err12 = {instancePath:instancePath+"/encodingId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
}
else {
const err13 = {instancePath:instancePath+"/encodingId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
var _valid3 = _errs36 === errors;
if(_valid3){
valid13 = true;
passing1 = 0;
}
const _errs39 = errors;
if(data8 !== null){
const err14 = {instancePath:instancePath+"/encodingId",schemaPath:"#/properties/encodingId/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
var _valid3 = _errs39 === errors;
if(_valid3 && valid13){
valid13 = false;
passing1 = [passing1, 1];
}
else {
if(_valid3){
valid13 = true;
passing1 = 1;
}
}
if(!valid13){
const err15 = {instancePath:instancePath+"/encodingId",schemaPath:"#/properties/encodingId/oneOf",keyword:"oneOf",params:{passingSchemas: passing1},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
validate140.errors = vErrors;
return false;
}
else {
errors = _errs35;
if(vErrors !== null){
if(_errs35){
vErrors.length = _errs35;
}
else {
vErrors = null;
}
}
}
var valid7 = _errs34 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.direction !== undefined){
let data9 = data.direction;
const _errs41 = errors;
if(!((data9 === "inbound") || (data9 === "outbound"))){
validate140.errors = [{instancePath:instancePath+"/direction",schemaPath:"#/properties/direction/enum",keyword:"enum",params:{allowedValues: schema193.properties.direction.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid7 = _errs41 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.mediaKind !== undefined){
let data10 = data.mediaKind;
const _errs42 = errors;
if(!((data10 === "audio") || (data10 === "video"))){
validate140.errors = [{instancePath:instancePath+"/mediaKind",schemaPath:"#/properties/mediaKind/enum",keyword:"enum",params:{allowedValues: schema193.properties.mediaKind.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid7 = _errs42 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.epoch !== undefined){
let data11 = data.epoch;
const _errs43 = errors;
const _errs44 = errors;
if(errors === _errs44){
if(typeof data11 === "string"){
if(func1(data11) > 512){
validate140.errors = [{instancePath:instancePath+"/epoch",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data11) < 1){
validate140.errors = [{instancePath:instancePath+"/epoch",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate140.errors = [{instancePath:instancePath+"/epoch",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid7 = _errs43 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.publisherStreamId !== undefined){
let data12 = data.publisherStreamId;
const _errs46 = errors;
const _errs47 = errors;
let valid16 = false;
let passing2 = null;
const _errs48 = errors;
const _errs49 = errors;
if(errors === _errs49){
if(typeof data12 === "string"){
if(func1(data12) > 512){
const err16 = {instancePath:instancePath+"/publisherStreamId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
else {
if(func1(data12) < 1){
const err17 = {instancePath:instancePath+"/publisherStreamId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
}
else {
const err18 = {instancePath:instancePath+"/publisherStreamId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
var _valid4 = _errs48 === errors;
if(_valid4){
valid16 = true;
passing2 = 0;
}
const _errs51 = errors;
if(data12 !== null){
const err19 = {instancePath:instancePath+"/publisherStreamId",schemaPath:"#/properties/publisherStreamId/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
var _valid4 = _errs51 === errors;
if(_valid4 && valid16){
valid16 = false;
passing2 = [passing2, 1];
}
else {
if(_valid4){
valid16 = true;
passing2 = 1;
}
}
if(!valid16){
const err20 = {instancePath:instancePath+"/publisherStreamId",schemaPath:"#/properties/publisherStreamId/oneOf",keyword:"oneOf",params:{passingSchemas: passing2},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
validate140.errors = vErrors;
return false;
}
else {
errors = _errs47;
if(vErrors !== null){
if(_errs47){
vErrors.length = _errs47;
}
else {
vErrors = null;
}
}
}
var valid7 = _errs46 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.relationshipSource !== undefined){
let data13 = data.relationshipSource;
const _errs53 = errors;
const _errs54 = errors;
let valid18 = false;
let passing3 = null;
const _errs55 = errors;
const _errs56 = errors;
if(errors === _errs56){
if(typeof data13 === "string"){
if(func1(data13) > 128){
const err21 = {instancePath:instancePath+"/relationshipSource",schemaPath:"common.json#/$defs/reasonCode/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
else {
if(func1(data13) < 1){
const err22 = {instancePath:instancePath+"/relationshipSource",schemaPath:"common.json#/$defs/reasonCode/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
else {
if(!pattern4.test(data13)){
const err23 = {instancePath:instancePath+"/relationshipSource",schemaPath:"common.json#/$defs/reasonCode/pattern",keyword:"pattern",params:{pattern: "^[a-z0-9]+(?:[-.][a-z0-9]+)*$"},message:"must match pattern \""+"^[a-z0-9]+(?:[-.][a-z0-9]+)*$"+"\""};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
}
}
else {
const err24 = {instancePath:instancePath+"/relationshipSource",schemaPath:"common.json#/$defs/reasonCode/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
var _valid5 = _errs55 === errors;
if(_valid5){
valid18 = true;
passing3 = 0;
}
const _errs58 = errors;
if(data13 !== null){
const err25 = {instancePath:instancePath+"/relationshipSource",schemaPath:"#/properties/relationshipSource/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
var _valid5 = _errs58 === errors;
if(_valid5 && valid18){
valid18 = false;
passing3 = [passing3, 1];
}
else {
if(_valid5){
valid18 = true;
passing3 = 1;
}
}
if(!valid18){
const err26 = {instancePath:instancePath+"/relationshipSource",schemaPath:"#/properties/relationshipSource/oneOf",keyword:"oneOf",params:{passingSchemas: passing3},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
validate140.errors = vErrors;
return false;
}
else {
errors = _errs54;
if(vErrors !== null){
if(_errs54){
vErrors.length = _errs54;
}
else {
vErrors = null;
}
}
}
var valid7 = _errs53 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.metrics !== undefined){
const _errs60 = errors;
if(!(validate134(data.metrics, {instancePath:instancePath+"/metrics",parentData:data,parentDataProperty:"metrics",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate134.errors : vErrors.concat(validate134.errors);
errors = vErrors.length;
}
var valid7 = _errs60 === errors;
}
else {
var valid7 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate140.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate140.errors = vErrors;
return errors === 0;
}
validate140.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const validatePathDigest = validate142;
const schema202 = {"type":"object","additionalProperties":true,"required":["pathId","participantId","peerConnectionId","transportId","range","selectedCandidatePairId","relayed","relayServer","protocol","relayProtocol","evidence"],"properties":{"pathId":{"$ref":"common.json#/$defs/opaqueId"},"participantId":{"$ref":"common.json#/$defs/opaqueId"},"peerConnectionId":{"$ref":"common.json#/$defs/opaqueId"},"transportId":{"$ref":"common.json#/$defs/opaqueId"},"range":{"$ref":"common.json#/$defs/timeRange"},"selectedCandidatePairId":{"oneOf":[{"$ref":"common.json#/$defs/opaqueId"},{"type":"null"}]},"relayed":{"oneOf":[{"type":"boolean"},{"type":"null"}]},"relayServer":{"oneOf":[{"type":"string","maxLength":256},{"type":"null"}]},"protocol":{"oneOf":[{"type":"string","maxLength":32},{"type":"null"}]},"relayProtocol":{"oneOf":[{"type":"string","maxLength":32},{"type":"null"}]},"evidence":{"$ref":"common.json#/$defs/evidenceRefs"}}};
const schema208 = {"type":"array","items":{"$ref":"#/$defs/evidenceRef"},"maxItems":256};
const schema209 = {"type":"object","additionalProperties":false,"required":["sourceId","at","recordId","statId"],"properties":{"sourceId":{"$ref":"#/$defs/opaqueId"},"at":{"oneOf":[{"$ref":"#/$defs/epochMs"},{"type":"null"}]},"recordId":{"oneOf":[{"$ref":"#/$defs/opaqueId"},{"type":"null"}]},"statId":{"oneOf":[{"$ref":"#/$defs/opaqueId"},{"type":"null"}]}}};

function validate145(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate145.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.sourceId === undefined) && (missing0 = "sourceId")) || ((data.at === undefined) && (missing0 = "at"))) || ((data.recordId === undefined) && (missing0 = "recordId"))) || ((data.statId === undefined) && (missing0 = "statId"))){
validate145.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "sourceId") || (key0 === "at")) || (key0 === "recordId")) || (key0 === "statId"))){
validate145.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.sourceId !== undefined){
let data0 = data.sourceId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 512){
validate145.errors = [{instancePath:instancePath+"/sourceId",schemaPath:"#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data0) < 1){
validate145.errors = [{instancePath:instancePath+"/sourceId",schemaPath:"#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate145.errors = [{instancePath:instancePath+"/sourceId",schemaPath:"#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.at !== undefined){
let data1 = data.at;
const _errs5 = errors;
const _errs6 = errors;
let valid2 = false;
let passing0 = null;
const _errs7 = errors;
const _errs8 = errors;
if(!((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1)))){
const err0 = {instancePath:instancePath+"/at",schemaPath:"#/$defs/epochMs/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(errors === _errs8){
if(typeof data1 == "number"){
if(data1 > 8640000000000000 || isNaN(data1)){
const err1 = {instancePath:instancePath+"/at",schemaPath:"#/$defs/epochMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 8640000000000000},message:"must be <= 8640000000000000"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
else {
if(data1 < -8640000000000000 || isNaN(data1)){
const err2 = {instancePath:instancePath+"/at",schemaPath:"#/$defs/epochMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: -8640000000000000},message:"must be >= -8640000000000000"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
}
}
var _valid0 = _errs7 === errors;
if(_valid0){
valid2 = true;
passing0 = 0;
}
const _errs10 = errors;
if(data1 !== null){
const err3 = {instancePath:instancePath+"/at",schemaPath:"#/properties/at/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
var _valid0 = _errs10 === errors;
if(_valid0 && valid2){
valid2 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid2 = true;
passing0 = 1;
}
}
if(!valid2){
const err4 = {instancePath:instancePath+"/at",schemaPath:"#/properties/at/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
validate145.errors = vErrors;
return false;
}
else {
errors = _errs6;
if(vErrors !== null){
if(_errs6){
vErrors.length = _errs6;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.recordId !== undefined){
let data2 = data.recordId;
const _errs12 = errors;
const _errs13 = errors;
let valid4 = false;
let passing1 = null;
const _errs14 = errors;
const _errs15 = errors;
if(errors === _errs15){
if(typeof data2 === "string"){
if(func1(data2) > 512){
const err5 = {instancePath:instancePath+"/recordId",schemaPath:"#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
else {
if(func1(data2) < 1){
const err6 = {instancePath:instancePath+"/recordId",schemaPath:"#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
}
else {
const err7 = {instancePath:instancePath+"/recordId",schemaPath:"#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
var _valid1 = _errs14 === errors;
if(_valid1){
valid4 = true;
passing1 = 0;
}
const _errs17 = errors;
if(data2 !== null){
const err8 = {instancePath:instancePath+"/recordId",schemaPath:"#/properties/recordId/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
var _valid1 = _errs17 === errors;
if(_valid1 && valid4){
valid4 = false;
passing1 = [passing1, 1];
}
else {
if(_valid1){
valid4 = true;
passing1 = 1;
}
}
if(!valid4){
const err9 = {instancePath:instancePath+"/recordId",schemaPath:"#/properties/recordId/oneOf",keyword:"oneOf",params:{passingSchemas: passing1},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
validate145.errors = vErrors;
return false;
}
else {
errors = _errs13;
if(vErrors !== null){
if(_errs13){
vErrors.length = _errs13;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.statId !== undefined){
let data3 = data.statId;
const _errs19 = errors;
const _errs20 = errors;
let valid6 = false;
let passing2 = null;
const _errs21 = errors;
const _errs22 = errors;
if(errors === _errs22){
if(typeof data3 === "string"){
if(func1(data3) > 512){
const err10 = {instancePath:instancePath+"/statId",schemaPath:"#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
else {
if(func1(data3) < 1){
const err11 = {instancePath:instancePath+"/statId",schemaPath:"#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
}
else {
const err12 = {instancePath:instancePath+"/statId",schemaPath:"#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
var _valid2 = _errs21 === errors;
if(_valid2){
valid6 = true;
passing2 = 0;
}
const _errs24 = errors;
if(data3 !== null){
const err13 = {instancePath:instancePath+"/statId",schemaPath:"#/properties/statId/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
var _valid2 = _errs24 === errors;
if(_valid2 && valid6){
valid6 = false;
passing2 = [passing2, 1];
}
else {
if(_valid2){
valid6 = true;
passing2 = 1;
}
}
if(!valid6){
const err14 = {instancePath:instancePath+"/statId",schemaPath:"#/properties/statId/oneOf",keyword:"oneOf",params:{passingSchemas: passing2},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
validate145.errors = vErrors;
return false;
}
else {
errors = _errs20;
if(vErrors !== null){
if(_errs20){
vErrors.length = _errs20;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs19 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
else {
validate145.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate145.errors = vErrors;
return errors === 0;
}
validate145.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate144(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate144.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(Array.isArray(data)){
if(data.length > 256){
validate144.errors = [{instancePath,schemaPath:"#/maxItems",keyword:"maxItems",params:{limit: 256},message:"must NOT have more than 256 items"}];
return false;
}
else {
var valid0 = true;
const len0 = data.length;
for(let i0=0; i0<len0; i0++){
const _errs1 = errors;
if(!(validate145(data[i0], {instancePath:instancePath+"/" + i0,parentData:data,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate145.errors : vErrors.concat(validate145.errors);
errors = vErrors.length;
}
var valid0 = _errs1 === errors;
if(!valid0){
break;
}
}
}
}
else {
validate144.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
validate144.errors = vErrors;
return errors === 0;
}
validate144.evaluated = {"items":true,"dynamicProps":false,"dynamicItems":false};


function validate142(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate142.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((((((data.pathId === undefined) && (missing0 = "pathId")) || ((data.participantId === undefined) && (missing0 = "participantId"))) || ((data.peerConnectionId === undefined) && (missing0 = "peerConnectionId"))) || ((data.transportId === undefined) && (missing0 = "transportId"))) || ((data.range === undefined) && (missing0 = "range"))) || ((data.selectedCandidatePairId === undefined) && (missing0 = "selectedCandidatePairId"))) || ((data.relayed === undefined) && (missing0 = "relayed"))) || ((data.relayServer === undefined) && (missing0 = "relayServer"))) || ((data.protocol === undefined) && (missing0 = "protocol"))) || ((data.relayProtocol === undefined) && (missing0 = "relayProtocol"))) || ((data.evidence === undefined) && (missing0 = "evidence"))){
validate142.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.pathId !== undefined){
let data0 = data.pathId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 512){
validate142.errors = [{instancePath:instancePath+"/pathId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data0) < 1){
validate142.errors = [{instancePath:instancePath+"/pathId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/pathId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.participantId !== undefined){
let data1 = data.participantId;
const _errs5 = errors;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data1 === "string"){
if(func1(data1) > 512){
validate142.errors = [{instancePath:instancePath+"/participantId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data1) < 1){
validate142.errors = [{instancePath:instancePath+"/participantId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/participantId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.peerConnectionId !== undefined){
let data2 = data.peerConnectionId;
const _errs8 = errors;
const _errs9 = errors;
if(errors === _errs9){
if(typeof data2 === "string"){
if(func1(data2) > 512){
validate142.errors = [{instancePath:instancePath+"/peerConnectionId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data2) < 1){
validate142.errors = [{instancePath:instancePath+"/peerConnectionId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/peerConnectionId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.transportId !== undefined){
let data3 = data.transportId;
const _errs11 = errors;
const _errs12 = errors;
if(errors === _errs12){
if(typeof data3 === "string"){
if(func1(data3) > 512){
validate142.errors = [{instancePath:instancePath+"/transportId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data3) < 1){
validate142.errors = [{instancePath:instancePath+"/transportId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate142.errors = [{instancePath:instancePath+"/transportId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.range !== undefined){
const _errs14 = errors;
if(!(validate129(data.range, {instancePath:instancePath+"/range",parentData:data,parentDataProperty:"range",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate129.errors : vErrors.concat(validate129.errors);
errors = vErrors.length;
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.selectedCandidatePairId !== undefined){
let data5 = data.selectedCandidatePairId;
const _errs15 = errors;
const _errs16 = errors;
let valid5 = false;
let passing0 = null;
const _errs17 = errors;
const _errs18 = errors;
if(errors === _errs18){
if(typeof data5 === "string"){
if(func1(data5) > 512){
const err0 = {instancePath:instancePath+"/selectedCandidatePairId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(func1(data5) < 1){
const err1 = {instancePath:instancePath+"/selectedCandidatePairId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
else {
const err2 = {instancePath:instancePath+"/selectedCandidatePairId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
var _valid0 = _errs17 === errors;
if(_valid0){
valid5 = true;
passing0 = 0;
}
const _errs20 = errors;
if(data5 !== null){
const err3 = {instancePath:instancePath+"/selectedCandidatePairId",schemaPath:"#/properties/selectedCandidatePairId/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
var _valid0 = _errs20 === errors;
if(_valid0 && valid5){
valid5 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid5 = true;
passing0 = 1;
}
}
if(!valid5){
const err4 = {instancePath:instancePath+"/selectedCandidatePairId",schemaPath:"#/properties/selectedCandidatePairId/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
validate142.errors = vErrors;
return false;
}
else {
errors = _errs16;
if(vErrors !== null){
if(_errs16){
vErrors.length = _errs16;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.relayed !== undefined){
let data6 = data.relayed;
const _errs22 = errors;
const _errs23 = errors;
let valid7 = false;
let passing1 = null;
const _errs24 = errors;
if(typeof data6 !== "boolean"){
const err5 = {instancePath:instancePath+"/relayed",schemaPath:"#/properties/relayed/oneOf/0/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
var _valid1 = _errs24 === errors;
if(_valid1){
valid7 = true;
passing1 = 0;
}
const _errs26 = errors;
if(data6 !== null){
const err6 = {instancePath:instancePath+"/relayed",schemaPath:"#/properties/relayed/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
var _valid1 = _errs26 === errors;
if(_valid1 && valid7){
valid7 = false;
passing1 = [passing1, 1];
}
else {
if(_valid1){
valid7 = true;
passing1 = 1;
}
}
if(!valid7){
const err7 = {instancePath:instancePath+"/relayed",schemaPath:"#/properties/relayed/oneOf",keyword:"oneOf",params:{passingSchemas: passing1},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
validate142.errors = vErrors;
return false;
}
else {
errors = _errs23;
if(vErrors !== null){
if(_errs23){
vErrors.length = _errs23;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs22 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.relayServer !== undefined){
let data7 = data.relayServer;
const _errs28 = errors;
const _errs29 = errors;
let valid8 = false;
let passing2 = null;
const _errs30 = errors;
if(errors === _errs30){
if(typeof data7 === "string"){
if(func1(data7) > 256){
const err8 = {instancePath:instancePath+"/relayServer",schemaPath:"#/properties/relayServer/oneOf/0/maxLength",keyword:"maxLength",params:{limit: 256},message:"must NOT have more than 256 characters"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
else {
const err9 = {instancePath:instancePath+"/relayServer",schemaPath:"#/properties/relayServer/oneOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
var _valid2 = _errs30 === errors;
if(_valid2){
valid8 = true;
passing2 = 0;
}
const _errs32 = errors;
if(data7 !== null){
const err10 = {instancePath:instancePath+"/relayServer",schemaPath:"#/properties/relayServer/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
var _valid2 = _errs32 === errors;
if(_valid2 && valid8){
valid8 = false;
passing2 = [passing2, 1];
}
else {
if(_valid2){
valid8 = true;
passing2 = 1;
}
}
if(!valid8){
const err11 = {instancePath:instancePath+"/relayServer",schemaPath:"#/properties/relayServer/oneOf",keyword:"oneOf",params:{passingSchemas: passing2},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
validate142.errors = vErrors;
return false;
}
else {
errors = _errs29;
if(vErrors !== null){
if(_errs29){
vErrors.length = _errs29;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs28 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocol !== undefined){
let data8 = data.protocol;
const _errs34 = errors;
const _errs35 = errors;
let valid9 = false;
let passing3 = null;
const _errs36 = errors;
if(errors === _errs36){
if(typeof data8 === "string"){
if(func1(data8) > 32){
const err12 = {instancePath:instancePath+"/protocol",schemaPath:"#/properties/protocol/oneOf/0/maxLength",keyword:"maxLength",params:{limit: 32},message:"must NOT have more than 32 characters"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
else {
const err13 = {instancePath:instancePath+"/protocol",schemaPath:"#/properties/protocol/oneOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
var _valid3 = _errs36 === errors;
if(_valid3){
valid9 = true;
passing3 = 0;
}
const _errs38 = errors;
if(data8 !== null){
const err14 = {instancePath:instancePath+"/protocol",schemaPath:"#/properties/protocol/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
var _valid3 = _errs38 === errors;
if(_valid3 && valid9){
valid9 = false;
passing3 = [passing3, 1];
}
else {
if(_valid3){
valid9 = true;
passing3 = 1;
}
}
if(!valid9){
const err15 = {instancePath:instancePath+"/protocol",schemaPath:"#/properties/protocol/oneOf",keyword:"oneOf",params:{passingSchemas: passing3},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
validate142.errors = vErrors;
return false;
}
else {
errors = _errs35;
if(vErrors !== null){
if(_errs35){
vErrors.length = _errs35;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs34 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.relayProtocol !== undefined){
let data9 = data.relayProtocol;
const _errs40 = errors;
const _errs41 = errors;
let valid10 = false;
let passing4 = null;
const _errs42 = errors;
if(errors === _errs42){
if(typeof data9 === "string"){
if(func1(data9) > 32){
const err16 = {instancePath:instancePath+"/relayProtocol",schemaPath:"#/properties/relayProtocol/oneOf/0/maxLength",keyword:"maxLength",params:{limit: 32},message:"must NOT have more than 32 characters"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
else {
const err17 = {instancePath:instancePath+"/relayProtocol",schemaPath:"#/properties/relayProtocol/oneOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
var _valid4 = _errs42 === errors;
if(_valid4){
valid10 = true;
passing4 = 0;
}
const _errs44 = errors;
if(data9 !== null){
const err18 = {instancePath:instancePath+"/relayProtocol",schemaPath:"#/properties/relayProtocol/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
var _valid4 = _errs44 === errors;
if(_valid4 && valid10){
valid10 = false;
passing4 = [passing4, 1];
}
else {
if(_valid4){
valid10 = true;
passing4 = 1;
}
}
if(!valid10){
const err19 = {instancePath:instancePath+"/relayProtocol",schemaPath:"#/properties/relayProtocol/oneOf",keyword:"oneOf",params:{passingSchemas: passing4},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
validate142.errors = vErrors;
return false;
}
else {
errors = _errs41;
if(vErrors !== null){
if(_errs41){
vErrors.length = _errs41;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs40 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.evidence !== undefined){
const _errs46 = errors;
if(!(validate144(data.evidence, {instancePath:instancePath+"/evidence",parentData:data,parentDataProperty:"evidence",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate144.errors : vErrors.concat(validate144.errors);
errors = vErrors.length;
}
var valid0 = _errs46 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate142.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate142.errors = vErrors;
return errors === 0;
}
validate142.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const validateTimelineRecord = validate148;
const schema214 = {"type":"object","additionalProperties":true,"required":["recordId","subject","range","kind","metricId","value","numerator","denominator","state","validity","evidence"],"properties":{"recordId":{"$ref":"common.json#/$defs/opaqueId"},"subject":{"$ref":"common.json#/$defs/subject"},"range":{"$ref":"common.json#/$defs/timeRange"},"kind":{"enum":["measurement","state","event","gap"]},"metricId":{"oneOf":[{"$ref":"common.json#/$defs/metricId"},{"type":"null"}]},"value":{"oneOf":[{"$ref":"common.json#/$defs/finiteNumber"},{"type":"null"}]},"numerator":{"oneOf":[{"$ref":"common.json#/$defs/finiteNumber"},{"type":"null"}]},"denominator":{"oneOf":[{"$ref":"common.json#/$defs/finiteNumber"},{"type":"null"}]},"state":{"oneOf":[{"type":"string","maxLength":128},{"type":"null"}]},"validity":{"enum":["valid","missing","stale","reset","gap"]},"evidence":{"$ref":"common.json#/$defs/evidenceRefs"}},"allOf":[{"if":{"properties":{"kind":{"enum":["state","gap"]}},"required":["kind"]},"then":{"properties":{"metricId":{"type":"null"},"value":{"type":"null"},"numerator":{"type":"null"},"denominator":{"type":"null"}}}},{"if":{"properties":{"kind":{"const":"measurement"}},"required":["kind"]},"then":{"properties":{"metricId":{"type":"string"}}}}]};
const schema216 = {"type":"object","additionalProperties":false,"required":["kind","id"],"properties":{"kind":{"$ref":"#/$defs/subjectKind"},"id":{"$ref":"#/$defs/opaqueId"}}};
const schema217 = {"enum":["call","participant","stream","transport"]};

function validate149(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate149.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.kind === undefined) && (missing0 = "kind")) || ((data.id === undefined) && (missing0 = "id"))){
validate149.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((key0 === "kind") || (key0 === "id"))){
validate149.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
let data0 = data.kind;
const _errs2 = errors;
if(!((((data0 === "call") || (data0 === "participant")) || (data0 === "stream")) || (data0 === "transport"))){
validate149.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/$defs/subjectKind/enum",keyword:"enum",params:{allowedValues: schema217.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.id !== undefined){
let data1 = data.id;
const _errs4 = errors;
const _errs5 = errors;
if(errors === _errs5){
if(typeof data1 === "string"){
if(func1(data1) > 512){
validate149.errors = [{instancePath:instancePath+"/id",schemaPath:"#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data1) < 1){
validate149.errors = [{instancePath:instancePath+"/id",schemaPath:"#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate149.errors = [{instancePath:instancePath+"/id",schemaPath:"#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
else {
validate149.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate149.errors = vErrors;
return errors === 0;
}
validate149.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate148(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate148.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs1 = errors;
const _errs2 = errors;
let valid1 = true;
const _errs3 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.kind === undefined) && (missing0 = "kind")){
const err0 = {};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(data.kind !== undefined){
let data0 = data.kind;
if(!((data0 === "state") || (data0 === "gap"))){
const err1 = {};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
}
var _valid0 = _errs3 === errors;
errors = _errs2;
if(vErrors !== null){
if(_errs2){
vErrors.length = _errs2;
}
else {
vErrors = null;
}
}
if(_valid0){
const _errs5 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.metricId !== undefined){
const _errs6 = errors;
if(data.metricId !== null){
validate148.errors = [{instancePath:instancePath+"/metricId",schemaPath:"#/allOf/0/then/properties/metricId/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
var valid3 = _errs6 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.value !== undefined){
const _errs8 = errors;
if(data.value !== null){
validate148.errors = [{instancePath:instancePath+"/value",schemaPath:"#/allOf/0/then/properties/value/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
var valid3 = _errs8 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.numerator !== undefined){
const _errs10 = errors;
if(data.numerator !== null){
validate148.errors = [{instancePath:instancePath+"/numerator",schemaPath:"#/allOf/0/then/properties/numerator/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
var valid3 = _errs10 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data.denominator !== undefined){
const _errs12 = errors;
if(data.denominator !== null){
validate148.errors = [{instancePath:instancePath+"/denominator",schemaPath:"#/allOf/0/then/properties/denominator/type",keyword:"type",params:{type: "null"},message:"must be null"}];
return false;
}
var valid3 = _errs12 === errors;
}
else {
var valid3 = true;
}
}
}
}
}
var _valid0 = _errs5 === errors;
valid1 = _valid0;
if(valid1){
var props0 = {};
props0.metricId = true;
props0.value = true;
props0.numerator = true;
props0.denominator = true;
props0.kind = true;
}
}
if(!valid1){
const err2 = {instancePath,schemaPath:"#/allOf/0/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
validate148.errors = vErrors;
return false;
}
var valid0 = _errs1 === errors;
if(valid0){
const _errs14 = errors;
const _errs15 = errors;
let valid4 = true;
const _errs16 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
let missing1;
if((data.kind === undefined) && (missing1 = "kind")){
const err3 = {};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
else {
if(data.kind !== undefined){
if("measurement" !== data.kind){
const err4 = {};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
}
}
var _valid1 = _errs16 === errors;
errors = _errs15;
if(vErrors !== null){
if(_errs15){
vErrors.length = _errs15;
}
else {
vErrors = null;
}
}
if(_valid1){
const _errs18 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.metricId !== undefined){
if(typeof data.metricId !== "string"){
validate148.errors = [{instancePath:instancePath+"/metricId",schemaPath:"#/allOf/1/then/properties/metricId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var _valid1 = _errs18 === errors;
valid4 = _valid1;
if(valid4){
var props1 = {};
props1.metricId = true;
props1.kind = true;
}
}
if(!valid4){
const err5 = {instancePath,schemaPath:"#/allOf/1/if",keyword:"if",params:{failingKeyword: "then"},message:"must match \"then\" schema"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
validate148.errors = vErrors;
return false;
}
var valid0 = _errs14 === errors;
if(valid0){
if(props0 !== true && props1 !== undefined){
if(props1 === true){
props0 = true;
}
else {
props0 = props0 || {};
Object.assign(props0, props1);
}
}
}
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing2;
if((((((((((((data.recordId === undefined) && (missing2 = "recordId")) || ((data.subject === undefined) && (missing2 = "subject"))) || ((data.range === undefined) && (missing2 = "range"))) || ((data.kind === undefined) && (missing2 = "kind"))) || ((data.metricId === undefined) && (missing2 = "metricId"))) || ((data.value === undefined) && (missing2 = "value"))) || ((data.numerator === undefined) && (missing2 = "numerator"))) || ((data.denominator === undefined) && (missing2 = "denominator"))) || ((data.state === undefined) && (missing2 = "state"))) || ((data.validity === undefined) && (missing2 = "validity"))) || ((data.evidence === undefined) && (missing2 = "evidence"))){
validate148.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing2},message:"must have required property '"+missing2+"'"}];
return false;
}
else {
if(data.recordId !== undefined){
let data7 = data.recordId;
const _errs22 = errors;
const _errs23 = errors;
if(errors === _errs23){
if(typeof data7 === "string"){
if(func1(data7) > 512){
validate148.errors = [{instancePath:instancePath+"/recordId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data7) < 1){
validate148.errors = [{instancePath:instancePath+"/recordId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate148.errors = [{instancePath:instancePath+"/recordId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid7 = _errs22 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.subject !== undefined){
const _errs25 = errors;
if(!(validate149(data.subject, {instancePath:instancePath+"/subject",parentData:data,parentDataProperty:"subject",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate149.errors : vErrors.concat(validate149.errors);
errors = vErrors.length;
}
var valid7 = _errs25 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.range !== undefined){
const _errs26 = errors;
if(!(validate129(data.range, {instancePath:instancePath+"/range",parentData:data,parentDataProperty:"range",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate129.errors : vErrors.concat(validate129.errors);
errors = vErrors.length;
}
var valid7 = _errs26 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.kind !== undefined){
let data10 = data.kind;
const _errs27 = errors;
if(!((((data10 === "measurement") || (data10 === "state")) || (data10 === "event")) || (data10 === "gap"))){
validate148.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/enum",keyword:"enum",params:{allowedValues: schema214.properties.kind.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid7 = _errs27 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.metricId !== undefined){
let data11 = data.metricId;
const _errs28 = errors;
const _errs29 = errors;
let valid9 = false;
let passing0 = null;
const _errs30 = errors;
const _errs31 = errors;
if(errors === _errs31){
if(typeof data11 === "string"){
if(func1(data11) > 128){
const err6 = {instancePath:instancePath+"/metricId",schemaPath:"common.json#/$defs/metricId/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
else {
if(func1(data11) < 1){
const err7 = {instancePath:instancePath+"/metricId",schemaPath:"common.json#/$defs/metricId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
else {
if(!pattern5.test(data11)){
const err8 = {instancePath:instancePath+"/metricId",schemaPath:"common.json#/$defs/metricId/pattern",keyword:"pattern",params:{pattern: "^[a-z][a-zA-Z0-9]*(?:\\.[a-z][a-zA-Z0-9]*)*$"},message:"must match pattern \""+"^[a-z][a-zA-Z0-9]*(?:\\.[a-z][a-zA-Z0-9]*)*$"+"\""};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
}
}
else {
const err9 = {instancePath:instancePath+"/metricId",schemaPath:"common.json#/$defs/metricId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
var _valid2 = _errs30 === errors;
if(_valid2){
valid9 = true;
passing0 = 0;
}
const _errs33 = errors;
if(data11 !== null){
const err10 = {instancePath:instancePath+"/metricId",schemaPath:"#/properties/metricId/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
var _valid2 = _errs33 === errors;
if(_valid2 && valid9){
valid9 = false;
passing0 = [passing0, 1];
}
else {
if(_valid2){
valid9 = true;
passing0 = 1;
}
}
if(!valid9){
const err11 = {instancePath:instancePath+"/metricId",schemaPath:"#/properties/metricId/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
validate148.errors = vErrors;
return false;
}
else {
errors = _errs29;
if(vErrors !== null){
if(_errs29){
vErrors.length = _errs29;
}
else {
vErrors = null;
}
}
}
var valid7 = _errs28 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.value !== undefined){
let data12 = data.value;
const _errs35 = errors;
const _errs36 = errors;
let valid11 = false;
let passing1 = null;
const _errs37 = errors;
if(!(typeof data12 == "number")){
const err12 = {instancePath:instancePath+"/value",schemaPath:"common.json#/$defs/finiteNumber/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
var _valid3 = _errs37 === errors;
if(_valid3){
valid11 = true;
passing1 = 0;
}
const _errs40 = errors;
if(data12 !== null){
const err13 = {instancePath:instancePath+"/value",schemaPath:"#/properties/value/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
var _valid3 = _errs40 === errors;
if(_valid3 && valid11){
valid11 = false;
passing1 = [passing1, 1];
}
else {
if(_valid3){
valid11 = true;
passing1 = 1;
}
}
if(!valid11){
const err14 = {instancePath:instancePath+"/value",schemaPath:"#/properties/value/oneOf",keyword:"oneOf",params:{passingSchemas: passing1},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
validate148.errors = vErrors;
return false;
}
else {
errors = _errs36;
if(vErrors !== null){
if(_errs36){
vErrors.length = _errs36;
}
else {
vErrors = null;
}
}
}
var valid7 = _errs35 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.numerator !== undefined){
let data13 = data.numerator;
const _errs42 = errors;
const _errs43 = errors;
let valid13 = false;
let passing2 = null;
const _errs44 = errors;
if(!(typeof data13 == "number")){
const err15 = {instancePath:instancePath+"/numerator",schemaPath:"common.json#/$defs/finiteNumber/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
var _valid4 = _errs44 === errors;
if(_valid4){
valid13 = true;
passing2 = 0;
}
const _errs47 = errors;
if(data13 !== null){
const err16 = {instancePath:instancePath+"/numerator",schemaPath:"#/properties/numerator/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
var _valid4 = _errs47 === errors;
if(_valid4 && valid13){
valid13 = false;
passing2 = [passing2, 1];
}
else {
if(_valid4){
valid13 = true;
passing2 = 1;
}
}
if(!valid13){
const err17 = {instancePath:instancePath+"/numerator",schemaPath:"#/properties/numerator/oneOf",keyword:"oneOf",params:{passingSchemas: passing2},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
validate148.errors = vErrors;
return false;
}
else {
errors = _errs43;
if(vErrors !== null){
if(_errs43){
vErrors.length = _errs43;
}
else {
vErrors = null;
}
}
}
var valid7 = _errs42 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.denominator !== undefined){
let data14 = data.denominator;
const _errs49 = errors;
const _errs50 = errors;
let valid15 = false;
let passing3 = null;
const _errs51 = errors;
if(!(typeof data14 == "number")){
const err18 = {instancePath:instancePath+"/denominator",schemaPath:"common.json#/$defs/finiteNumber/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
var _valid5 = _errs51 === errors;
if(_valid5){
valid15 = true;
passing3 = 0;
}
const _errs54 = errors;
if(data14 !== null){
const err19 = {instancePath:instancePath+"/denominator",schemaPath:"#/properties/denominator/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
var _valid5 = _errs54 === errors;
if(_valid5 && valid15){
valid15 = false;
passing3 = [passing3, 1];
}
else {
if(_valid5){
valid15 = true;
passing3 = 1;
}
}
if(!valid15){
const err20 = {instancePath:instancePath+"/denominator",schemaPath:"#/properties/denominator/oneOf",keyword:"oneOf",params:{passingSchemas: passing3},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
validate148.errors = vErrors;
return false;
}
else {
errors = _errs50;
if(vErrors !== null){
if(_errs50){
vErrors.length = _errs50;
}
else {
vErrors = null;
}
}
}
var valid7 = _errs49 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.state !== undefined){
let data15 = data.state;
const _errs56 = errors;
const _errs57 = errors;
let valid17 = false;
let passing4 = null;
const _errs58 = errors;
if(errors === _errs58){
if(typeof data15 === "string"){
if(func1(data15) > 128){
const err21 = {instancePath:instancePath+"/state",schemaPath:"#/properties/state/oneOf/0/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
else {
const err22 = {instancePath:instancePath+"/state",schemaPath:"#/properties/state/oneOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
var _valid6 = _errs58 === errors;
if(_valid6){
valid17 = true;
passing4 = 0;
}
const _errs60 = errors;
if(data15 !== null){
const err23 = {instancePath:instancePath+"/state",schemaPath:"#/properties/state/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
var _valid6 = _errs60 === errors;
if(_valid6 && valid17){
valid17 = false;
passing4 = [passing4, 1];
}
else {
if(_valid6){
valid17 = true;
passing4 = 1;
}
}
if(!valid17){
const err24 = {instancePath:instancePath+"/state",schemaPath:"#/properties/state/oneOf",keyword:"oneOf",params:{passingSchemas: passing4},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
validate148.errors = vErrors;
return false;
}
else {
errors = _errs57;
if(vErrors !== null){
if(_errs57){
vErrors.length = _errs57;
}
else {
vErrors = null;
}
}
}
var valid7 = _errs56 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.validity !== undefined){
let data16 = data.validity;
const _errs62 = errors;
if(!(((((data16 === "valid") || (data16 === "missing")) || (data16 === "stale")) || (data16 === "reset")) || (data16 === "gap"))){
validate148.errors = [{instancePath:instancePath+"/validity",schemaPath:"#/properties/validity/enum",keyword:"enum",params:{allowedValues: schema214.properties.validity.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid7 = _errs62 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data.evidence !== undefined){
const _errs63 = errors;
if(!(validate144(data.evidence, {instancePath:instancePath+"/evidence",parentData:data,parentDataProperty:"evidence",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate144.errors : vErrors.concat(validate144.errors);
errors = vErrors.length;
}
var valid7 = _errs63 === errors;
}
else {
var valid7 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate148.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate148.errors = vErrors;
return errors === 0;
}
validate148.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const validateFinding = validate153;
const schema223 = {"type":"object","additionalProperties":true,"required":["findingId","category","type","severity","subject","affectedParticipantIds","startedAt","resolvedAt","lastObservedAt","origin","certainty","confidence","algorithmId","evidence"],"properties":{"findingId":{"$ref":"common.json#/$defs/opaqueId"},"category":{"$ref":"common.json#/$defs/findingCategory"},"type":{"type":"string","minLength":1,"maxLength":128},"severity":{"enum":["info","warning","critical"]},"subject":{"$ref":"common.json#/$defs/subject"},"affectedParticipantIds":{"type":"array","items":{"$ref":"common.json#/$defs/opaqueId"},"maxItems":1024},"startedAt":{"$ref":"common.json#/$defs/epochMs"},"resolvedAt":{"oneOf":[{"$ref":"common.json#/$defs/epochMs"},{"type":"null"}]},"lastObservedAt":{"$ref":"common.json#/$defs/epochMs"},"origin":{"enum":["client-detector","observer-detector","digest-rule"]},"certainty":{"enum":["observation","hypothesis"]},"confidence":{"oneOf":[{"enum":["low","medium","high"]},{"type":"null"}]},"algorithmId":{"$ref":"common.json#/$defs/opaqueId"},"evidence":{"$ref":"common.json#/$defs/evidenceRefs"}}};

function validate153(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate153.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((((((((((data.findingId === undefined) && (missing0 = "findingId")) || ((data.category === undefined) && (missing0 = "category"))) || ((data.type === undefined) && (missing0 = "type"))) || ((data.severity === undefined) && (missing0 = "severity"))) || ((data.subject === undefined) && (missing0 = "subject"))) || ((data.affectedParticipantIds === undefined) && (missing0 = "affectedParticipantIds"))) || ((data.startedAt === undefined) && (missing0 = "startedAt"))) || ((data.resolvedAt === undefined) && (missing0 = "resolvedAt"))) || ((data.lastObservedAt === undefined) && (missing0 = "lastObservedAt"))) || ((data.origin === undefined) && (missing0 = "origin"))) || ((data.certainty === undefined) && (missing0 = "certainty"))) || ((data.confidence === undefined) && (missing0 = "confidence"))) || ((data.algorithmId === undefined) && (missing0 = "algorithmId"))) || ((data.evidence === undefined) && (missing0 = "evidence"))){
validate153.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
if(data.findingId !== undefined){
let data0 = data.findingId;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(typeof data0 === "string"){
if(func1(data0) > 512){
validate153.errors = [{instancePath:instancePath+"/findingId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data0) < 1){
validate153.errors = [{instancePath:instancePath+"/findingId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate153.errors = [{instancePath:instancePath+"/findingId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.category !== undefined){
let data1 = data.category;
const _errs5 = errors;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data1 === "string"){
if(func1(data1) > 128){
validate153.errors = [{instancePath:instancePath+"/category",schemaPath:"common.json#/$defs/findingCategory/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"}];
return false;
}
else {
if(func1(data1) < 1){
validate153.errors = [{instancePath:instancePath+"/category",schemaPath:"common.json#/$defs/findingCategory/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate153.errors = [{instancePath:instancePath+"/category",schemaPath:"common.json#/$defs/findingCategory/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.type !== undefined){
let data2 = data.type;
const _errs8 = errors;
if(errors === _errs8){
if(typeof data2 === "string"){
if(func1(data2) > 128){
validate153.errors = [{instancePath:instancePath+"/type",schemaPath:"#/properties/type/maxLength",keyword:"maxLength",params:{limit: 128},message:"must NOT have more than 128 characters"}];
return false;
}
else {
if(func1(data2) < 1){
validate153.errors = [{instancePath:instancePath+"/type",schemaPath:"#/properties/type/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate153.errors = [{instancePath:instancePath+"/type",schemaPath:"#/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.severity !== undefined){
let data3 = data.severity;
const _errs10 = errors;
if(!(((data3 === "info") || (data3 === "warning")) || (data3 === "critical"))){
validate153.errors = [{instancePath:instancePath+"/severity",schemaPath:"#/properties/severity/enum",keyword:"enum",params:{allowedValues: schema223.properties.severity.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.subject !== undefined){
const _errs11 = errors;
if(!(validate149(data.subject, {instancePath:instancePath+"/subject",parentData:data,parentDataProperty:"subject",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate149.errors : vErrors.concat(validate149.errors);
errors = vErrors.length;
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.affectedParticipantIds !== undefined){
let data5 = data.affectedParticipantIds;
const _errs12 = errors;
if(errors === _errs12){
if(Array.isArray(data5)){
if(data5.length > 1024){
validate153.errors = [{instancePath:instancePath+"/affectedParticipantIds",schemaPath:"#/properties/affectedParticipantIds/maxItems",keyword:"maxItems",params:{limit: 1024},message:"must NOT have more than 1024 items"}];
return false;
}
else {
var valid3 = true;
const len0 = data5.length;
for(let i0=0; i0<len0; i0++){
let data6 = data5[i0];
const _errs14 = errors;
const _errs15 = errors;
if(errors === _errs15){
if(typeof data6 === "string"){
if(func1(data6) > 512){
validate153.errors = [{instancePath:instancePath+"/affectedParticipantIds/" + i0,schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data6) < 1){
validate153.errors = [{instancePath:instancePath+"/affectedParticipantIds/" + i0,schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate153.errors = [{instancePath:instancePath+"/affectedParticipantIds/" + i0,schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid3 = _errs14 === errors;
if(!valid3){
break;
}
}
}
}
else {
validate153.errors = [{instancePath:instancePath+"/affectedParticipantIds",schemaPath:"#/properties/affectedParticipantIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.startedAt !== undefined){
let data7 = data.startedAt;
const _errs17 = errors;
const _errs18 = errors;
if(!((typeof data7 == "number") && (!(data7 % 1) && !isNaN(data7)))){
validate153.errors = [{instancePath:instancePath+"/startedAt",schemaPath:"common.json#/$defs/epochMs/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs18){
if(typeof data7 == "number"){
if(data7 > 8640000000000000 || isNaN(data7)){
validate153.errors = [{instancePath:instancePath+"/startedAt",schemaPath:"common.json#/$defs/epochMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 8640000000000000},message:"must be <= 8640000000000000"}];
return false;
}
else {
if(data7 < -8640000000000000 || isNaN(data7)){
validate153.errors = [{instancePath:instancePath+"/startedAt",schemaPath:"common.json#/$defs/epochMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: -8640000000000000},message:"must be >= -8640000000000000"}];
return false;
}
}
}
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.resolvedAt !== undefined){
let data8 = data.resolvedAt;
const _errs20 = errors;
const _errs21 = errors;
let valid6 = false;
let passing0 = null;
const _errs22 = errors;
const _errs23 = errors;
if(!((typeof data8 == "number") && (!(data8 % 1) && !isNaN(data8)))){
const err0 = {instancePath:instancePath+"/resolvedAt",schemaPath:"common.json#/$defs/epochMs/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(errors === _errs23){
if(typeof data8 == "number"){
if(data8 > 8640000000000000 || isNaN(data8)){
const err1 = {instancePath:instancePath+"/resolvedAt",schemaPath:"common.json#/$defs/epochMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 8640000000000000},message:"must be <= 8640000000000000"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
else {
if(data8 < -8640000000000000 || isNaN(data8)){
const err2 = {instancePath:instancePath+"/resolvedAt",schemaPath:"common.json#/$defs/epochMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: -8640000000000000},message:"must be >= -8640000000000000"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
}
}
var _valid0 = _errs22 === errors;
if(_valid0){
valid6 = true;
passing0 = 0;
}
const _errs25 = errors;
if(data8 !== null){
const err3 = {instancePath:instancePath+"/resolvedAt",schemaPath:"#/properties/resolvedAt/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
var _valid0 = _errs25 === errors;
if(_valid0 && valid6){
valid6 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid6 = true;
passing0 = 1;
}
}
if(!valid6){
const err4 = {instancePath:instancePath+"/resolvedAt",schemaPath:"#/properties/resolvedAt/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
validate153.errors = vErrors;
return false;
}
else {
errors = _errs21;
if(vErrors !== null){
if(_errs21){
vErrors.length = _errs21;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs20 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.lastObservedAt !== undefined){
let data9 = data.lastObservedAt;
const _errs27 = errors;
const _errs28 = errors;
if(!((typeof data9 == "number") && (!(data9 % 1) && !isNaN(data9)))){
validate153.errors = [{instancePath:instancePath+"/lastObservedAt",schemaPath:"common.json#/$defs/epochMs/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs28){
if(typeof data9 == "number"){
if(data9 > 8640000000000000 || isNaN(data9)){
validate153.errors = [{instancePath:instancePath+"/lastObservedAt",schemaPath:"common.json#/$defs/epochMs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 8640000000000000},message:"must be <= 8640000000000000"}];
return false;
}
else {
if(data9 < -8640000000000000 || isNaN(data9)){
validate153.errors = [{instancePath:instancePath+"/lastObservedAt",schemaPath:"common.json#/$defs/epochMs/minimum",keyword:"minimum",params:{comparison: ">=", limit: -8640000000000000},message:"must be >= -8640000000000000"}];
return false;
}
}
}
}
var valid0 = _errs27 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.origin !== undefined){
let data10 = data.origin;
const _errs30 = errors;
if(!(((data10 === "client-detector") || (data10 === "observer-detector")) || (data10 === "digest-rule"))){
validate153.errors = [{instancePath:instancePath+"/origin",schemaPath:"#/properties/origin/enum",keyword:"enum",params:{allowedValues: schema223.properties.origin.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs30 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.certainty !== undefined){
let data11 = data.certainty;
const _errs31 = errors;
if(!((data11 === "observation") || (data11 === "hypothesis"))){
validate153.errors = [{instancePath:instancePath+"/certainty",schemaPath:"#/properties/certainty/enum",keyword:"enum",params:{allowedValues: schema223.properties.certainty.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs31 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.confidence !== undefined){
let data12 = data.confidence;
const _errs32 = errors;
const _errs33 = errors;
let valid9 = false;
let passing1 = null;
const _errs34 = errors;
if(!(((data12 === "low") || (data12 === "medium")) || (data12 === "high"))){
const err5 = {instancePath:instancePath+"/confidence",schemaPath:"#/properties/confidence/oneOf/0/enum",keyword:"enum",params:{allowedValues: schema223.properties.confidence.oneOf[0].enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
var _valid1 = _errs34 === errors;
if(_valid1){
valid9 = true;
passing1 = 0;
}
const _errs35 = errors;
if(data12 !== null){
const err6 = {instancePath:instancePath+"/confidence",schemaPath:"#/properties/confidence/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
var _valid1 = _errs35 === errors;
if(_valid1 && valid9){
valid9 = false;
passing1 = [passing1, 1];
}
else {
if(_valid1){
valid9 = true;
passing1 = 1;
}
}
if(!valid9){
const err7 = {instancePath:instancePath+"/confidence",schemaPath:"#/properties/confidence/oneOf",keyword:"oneOf",params:{passingSchemas: passing1},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
validate153.errors = vErrors;
return false;
}
else {
errors = _errs33;
if(vErrors !== null){
if(_errs33){
vErrors.length = _errs33;
}
else {
vErrors = null;
}
}
}
var valid0 = _errs32 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.algorithmId !== undefined){
let data13 = data.algorithmId;
const _errs37 = errors;
const _errs38 = errors;
if(errors === _errs38){
if(typeof data13 === "string"){
if(func1(data13) > 512){
validate153.errors = [{instancePath:instancePath+"/algorithmId",schemaPath:"common.json#/$defs/opaqueId/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func1(data13) < 1){
validate153.errors = [{instancePath:instancePath+"/algorithmId",schemaPath:"common.json#/$defs/opaqueId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate153.errors = [{instancePath:instancePath+"/algorithmId",schemaPath:"common.json#/$defs/opaqueId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs37 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.evidence !== undefined){
const _errs40 = errors;
if(!(validate144(data.evidence, {instancePath:instancePath+"/evidence",parentData:data,parentDataProperty:"evidence",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate144.errors : vErrors.concat(validate144.errors);
errors = vErrors.length;
}
var valid0 = _errs40 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate153.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate153.errors = vErrors;
return errors === 0;
}
validate153.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};
