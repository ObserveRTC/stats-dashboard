"use strict";
import __ajvRuntime0 from "ajv/dist/runtime/ucs2length.js";
export const validateCallDigest = validate20;
const schema31 = {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://schemas.observertc.org/digest/v2/call-digest.json","type":"object","additionalProperties":false,"required":["provenance","call","coverage","checks","clients"],"properties":{"provenance":{"$ref":"common.json#/$defs/provenance"},"call":{"$ref":"#/$defs/callIdentity"},"coverage":{"$ref":"#/$defs/callCoverage"},"checks":{"type":"array","items":{"$ref":"#/$defs/callCheck"}},"clients":{"type":"array","items":{"$ref":"#/$defs/clientDigest"}}},"$defs":{"callIdentity":{"type":"object","additionalProperties":false,"required":["callId","roomId","startedAt","endedAt","reportingDay"],"properties":{"callId":{"type":"string","minLength":1},"roomId":{"type":"string","minLength":1},"startedAt":{"$ref":"common.json#/$defs/instant"},"endedAt":{"$ref":"common.json#/$defs/instant"},"reportingDay":{"$ref":"common.json#/$defs/reportingDay"},"sfuIds":{"type":"array","items":{"type":"string"}}}},"callCoverage":{"type":"object","additionalProperties":false,"required":["observedSeconds","assessedSeconds","unassessedSeconds","clientsObserved","clientsAssessed","callSummaryPresent"],"properties":{"observedSeconds":{"type":"number","minimum":0},"assessedSeconds":{"type":"number","minimum":0},"unassessedSeconds":{"type":"number","minimum":0},"gaps":{"type":"array","items":{"$ref":"common.json#/$defs/gap"}},"clientsObserved":{"type":"integer","minimum":0},"clientsAssessed":{"type":"integer","minimum":0},"callSummaryPresent":{"type":"boolean"},"limitations":{"type":"array","items":{"type":"string","maxLength":300}}}},"callCheck":{"type":"object","additionalProperties":false,"required":["id","counts"],"properties":{"id":{"type":"string","minLength":1},"counts":{"$ref":"common.json#/$defs/outcomeCounts"},"failedSeconds":{"type":["number","null"],"minimum":0}}},"clientDigest":{"type":"object","additionalProperties":false,"required":["clientId","coverage","checks"],"properties":{"clientId":{"type":"string","minLength":1},"displayName":{"type":"string"},"coverage":{"$ref":"common.json#/$defs/coverage"},"classification":{"$ref":"#/$defs/classification"},"checks":{"type":"array","items":{"$ref":"#/$defs/clientCheck"}}}},"classification":{"enum":["qoe-symptom","qos-only","no-issue-within-coverage","insufficient-evidence"]},"clientCheck":{"type":"object","additionalProperties":false,"required":["id","outcome"],"properties":{"id":{"type":"string","minLength":1},"outcome":{"$ref":"common.json#/$defs/outcome"},"subject":{"$ref":"common.json#/$defs/subject"},"rule":{"type":"string","maxLength":300},"why":{"type":"string","maxLength":300},"observed":{"type":"array","items":{"$ref":"common.json#/$defs/observedValue"}},"interval":{"$ref":"common.json#/$defs/interval"},"issues":{"type":"array","items":{"$ref":"common.json#/$defs/issueRef"}},"events":{"type":"array","items":{"$ref":"common.json#/$defs/eventRef"}},"evidence":{"type":"array","items":{"$ref":"common.json#/$defs/evidenceRef"}}}}}};
const schema33 = {"type":"object","additionalProperties":false,"required":["schemaVersion","rulesVersion","generatedAt"],"properties":{"schemaVersion":{"type":"integer","const":2},"rulesVersion":{"type":"string","minLength":1},"generatedAt":{"$ref":"#/$defs/instant"}}};
const schema34 = {"type":"string","format":"date-time","pattern":"Z$"};
const func1 = __ajvRuntime0.default;
const pattern4 = new RegExp("Z$", "u");

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
if((((data.schemaVersion === undefined) && (missing0 = "schemaVersion")) || ((data.rulesVersion === undefined) && (missing0 = "rulesVersion"))) || ((data.generatedAt === undefined) && (missing0 = "generatedAt"))){
validate22.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((key0 === "schemaVersion") || (key0 === "rulesVersion")) || (key0 === "generatedAt"))){
validate22.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.schemaVersion !== undefined){
let data0 = data.schemaVersion;
const _errs2 = errors;
if(!((typeof data0 == "number") && (!(data0 % 1) && !isNaN(data0)))){
validate22.errors = [{instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(2 !== data0){
validate22.errors = [{instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: 2},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.rulesVersion !== undefined){
let data1 = data.rulesVersion;
const _errs4 = errors;
if(errors === _errs4){
if(typeof data1 === "string"){
if(func1(data1) < 1){
validate22.errors = [{instancePath:instancePath+"/rulesVersion",schemaPath:"#/properties/rulesVersion/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate22.errors = [{instancePath:instancePath+"/rulesVersion",schemaPath:"#/properties/rulesVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.generatedAt !== undefined){
let data2 = data.generatedAt;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(errors === _errs7){
if(typeof data2 === "string"){
if(!pattern4.test(data2)){
validate22.errors = [{instancePath:instancePath+"/generatedAt",schemaPath:"#/$defs/instant/pattern",keyword:"pattern",params:{pattern: "Z$"},message:"must match pattern \""+"Z$"+"\""}];
return false;
}
}
else {
validate22.errors = [{instancePath:instancePath+"/generatedAt",schemaPath:"#/$defs/instant/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs6 === errors;
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
validate22.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate22.errors = vErrors;
return errors === 0;
}
validate22.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema35 = {"type":"object","additionalProperties":false,"required":["callId","roomId","startedAt","endedAt","reportingDay"],"properties":{"callId":{"type":"string","minLength":1},"roomId":{"type":"string","minLength":1},"startedAt":{"$ref":"common.json#/$defs/instant"},"endedAt":{"$ref":"common.json#/$defs/instant"},"reportingDay":{"$ref":"common.json#/$defs/reportingDay"},"sfuIds":{"type":"array","items":{"type":"string"}}}};
const schema38 = {"type":"string","pattern":"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$"};
const pattern7 = new RegExp("^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$", "u");

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
if((((((data.callId === undefined) && (missing0 = "callId")) || ((data.roomId === undefined) && (missing0 = "roomId"))) || ((data.startedAt === undefined) && (missing0 = "startedAt"))) || ((data.endedAt === undefined) && (missing0 = "endedAt"))) || ((data.reportingDay === undefined) && (missing0 = "reportingDay"))){
validate24.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "callId") || (key0 === "roomId")) || (key0 === "startedAt")) || (key0 === "endedAt")) || (key0 === "reportingDay")) || (key0 === "sfuIds"))){
validate24.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.callId !== undefined){
let data0 = data.callId;
const _errs2 = errors;
if(errors === _errs2){
if(typeof data0 === "string"){
if(func1(data0) < 1){
validate24.errors = [{instancePath:instancePath+"/callId",schemaPath:"#/properties/callId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate24.errors = [{instancePath:instancePath+"/callId",schemaPath:"#/properties/callId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
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
const _errs4 = errors;
if(errors === _errs4){
if(typeof data1 === "string"){
if(func1(data1) < 1){
validate24.errors = [{instancePath:instancePath+"/roomId",schemaPath:"#/properties/roomId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate24.errors = [{instancePath:instancePath+"/roomId",schemaPath:"#/properties/roomId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.startedAt !== undefined){
let data2 = data.startedAt;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(errors === _errs7){
if(typeof data2 === "string"){
if(!pattern4.test(data2)){
validate24.errors = [{instancePath:instancePath+"/startedAt",schemaPath:"common.json#/$defs/instant/pattern",keyword:"pattern",params:{pattern: "Z$"},message:"must match pattern \""+"Z$"+"\""}];
return false;
}
}
else {
validate24.errors = [{instancePath:instancePath+"/startedAt",schemaPath:"common.json#/$defs/instant/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.endedAt !== undefined){
let data3 = data.endedAt;
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(errors === _errs10){
if(typeof data3 === "string"){
if(!pattern4.test(data3)){
validate24.errors = [{instancePath:instancePath+"/endedAt",schemaPath:"common.json#/$defs/instant/pattern",keyword:"pattern",params:{pattern: "Z$"},message:"must match pattern \""+"Z$"+"\""}];
return false;
}
}
else {
validate24.errors = [{instancePath:instancePath+"/endedAt",schemaPath:"common.json#/$defs/instant/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.reportingDay !== undefined){
let data4 = data.reportingDay;
const _errs12 = errors;
const _errs13 = errors;
if(errors === _errs13){
if(typeof data4 === "string"){
if(!pattern7.test(data4)){
validate24.errors = [{instancePath:instancePath+"/reportingDay",schemaPath:"common.json#/$defs/reportingDay/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$"},message:"must match pattern \""+"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$"+"\""}];
return false;
}
}
else {
validate24.errors = [{instancePath:instancePath+"/reportingDay",schemaPath:"common.json#/$defs/reportingDay/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sfuIds !== undefined){
let data5 = data.sfuIds;
const _errs15 = errors;
if(errors === _errs15){
if(Array.isArray(data5)){
var valid4 = true;
const len0 = data5.length;
for(let i0=0; i0<len0; i0++){
const _errs17 = errors;
if(typeof data5[i0] !== "string"){
validate24.errors = [{instancePath:instancePath+"/sfuIds/" + i0,schemaPath:"#/properties/sfuIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid4 = _errs17 === errors;
if(!valid4){
break;
}
}
}
else {
validate24.errors = [{instancePath:instancePath+"/sfuIds",schemaPath:"#/properties/sfuIds/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs15 === errors;
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
else {
validate24.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate24.errors = vErrors;
return errors === 0;
}
validate24.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema39 = {"type":"object","additionalProperties":false,"required":["observedSeconds","assessedSeconds","unassessedSeconds","clientsObserved","clientsAssessed","callSummaryPresent"],"properties":{"observedSeconds":{"type":"number","minimum":0},"assessedSeconds":{"type":"number","minimum":0},"unassessedSeconds":{"type":"number","minimum":0},"gaps":{"type":"array","items":{"$ref":"common.json#/$defs/gap"}},"clientsObserved":{"type":"integer","minimum":0},"clientsAssessed":{"type":"integer","minimum":0},"callSummaryPresent":{"type":"boolean"},"limitations":{"type":"array","items":{"type":"string","maxLength":300}}}};
const schema40 = {"type":"object","additionalProperties":false,"required":["from","to","reason"],"properties":{"from":{"$ref":"#/$defs/instant"},"to":{"$ref":"#/$defs/instant"},"reason":{"$ref":"#/$defs/gapReason"}}};
const schema43 = {"enum":["stats-collection-gap","tab-hidden","before-first-sample","after-last-sample","counter-reset"]};

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
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.from === undefined) && (missing0 = "from")) || ((data.to === undefined) && (missing0 = "to"))) || ((data.reason === undefined) && (missing0 = "reason"))){
validate27.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((key0 === "from") || (key0 === "to")) || (key0 === "reason"))){
validate27.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.from !== undefined){
let data0 = data.from;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(errors === _errs3){
if(typeof data0 === "string"){
if(!pattern4.test(data0)){
validate27.errors = [{instancePath:instancePath+"/from",schemaPath:"#/$defs/instant/pattern",keyword:"pattern",params:{pattern: "Z$"},message:"must match pattern \""+"Z$"+"\""}];
return false;
}
}
else {
validate27.errors = [{instancePath:instancePath+"/from",schemaPath:"#/$defs/instant/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.to !== undefined){
let data1 = data.to;
const _errs5 = errors;
const _errs6 = errors;
if(errors === _errs6){
if(errors === _errs6){
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
validate27.errors = [{instancePath:instancePath+"/to",schemaPath:"#/$defs/instant/pattern",keyword:"pattern",params:{pattern: "Z$"},message:"must match pattern \""+"Z$"+"\""}];
return false;
}
}
else {
validate27.errors = [{instancePath:instancePath+"/to",schemaPath:"#/$defs/instant/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.reason !== undefined){
let data2 = data.reason;
const _errs8 = errors;
if(!(((((data2 === "stats-collection-gap") || (data2 === "tab-hidden")) || (data2 === "before-first-sample")) || (data2 === "after-last-sample")) || (data2 === "counter-reset"))){
validate27.errors = [{instancePath:instancePath+"/reason",schemaPath:"#/$defs/gapReason/enum",keyword:"enum",params:{allowedValues: schema43.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs8 === errors;
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
validate27.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate27.errors = vErrors;
return errors === 0;
}
validate27.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


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
if(((((((data.observedSeconds === undefined) && (missing0 = "observedSeconds")) || ((data.assessedSeconds === undefined) && (missing0 = "assessedSeconds"))) || ((data.unassessedSeconds === undefined) && (missing0 = "unassessedSeconds"))) || ((data.clientsObserved === undefined) && (missing0 = "clientsObserved"))) || ((data.clientsAssessed === undefined) && (missing0 = "clientsAssessed"))) || ((data.callSummaryPresent === undefined) && (missing0 = "callSummaryPresent"))){
validate26.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((((key0 === "observedSeconds") || (key0 === "assessedSeconds")) || (key0 === "unassessedSeconds")) || (key0 === "gaps")) || (key0 === "clientsObserved")) || (key0 === "clientsAssessed")) || (key0 === "callSummaryPresent")) || (key0 === "limitations"))){
validate26.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.observedSeconds !== undefined){
let data0 = data.observedSeconds;
const _errs2 = errors;
if(errors === _errs2){
if(typeof data0 == "number"){
if(data0 < 0 || isNaN(data0)){
validate26.errors = [{instancePath:instancePath+"/observedSeconds",schemaPath:"#/properties/observedSeconds/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
else {
validate26.errors = [{instancePath:instancePath+"/observedSeconds",schemaPath:"#/properties/observedSeconds/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.assessedSeconds !== undefined){
let data1 = data.assessedSeconds;
const _errs4 = errors;
if(errors === _errs4){
if(typeof data1 == "number"){
if(data1 < 0 || isNaN(data1)){
validate26.errors = [{instancePath:instancePath+"/assessedSeconds",schemaPath:"#/properties/assessedSeconds/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
else {
validate26.errors = [{instancePath:instancePath+"/assessedSeconds",schemaPath:"#/properties/assessedSeconds/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.unassessedSeconds !== undefined){
let data2 = data.unassessedSeconds;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data2 == "number"){
if(data2 < 0 || isNaN(data2)){
validate26.errors = [{instancePath:instancePath+"/unassessedSeconds",schemaPath:"#/properties/unassessedSeconds/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
else {
validate26.errors = [{instancePath:instancePath+"/unassessedSeconds",schemaPath:"#/properties/unassessedSeconds/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.gaps !== undefined){
let data3 = data.gaps;
const _errs8 = errors;
if(errors === _errs8){
if(Array.isArray(data3)){
var valid1 = true;
const len0 = data3.length;
for(let i0=0; i0<len0; i0++){
const _errs10 = errors;
if(!(validate27(data3[i0], {instancePath:instancePath+"/gaps/" + i0,parentData:data3,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate27.errors : vErrors.concat(validate27.errors);
errors = vErrors.length;
}
var valid1 = _errs10 === errors;
if(!valid1){
break;
}
}
}
else {
validate26.errors = [{instancePath:instancePath+"/gaps",schemaPath:"#/properties/gaps/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.clientsObserved !== undefined){
let data5 = data.clientsObserved;
const _errs11 = errors;
if(!((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5)))){
validate26.errors = [{instancePath:instancePath+"/clientsObserved",schemaPath:"#/properties/clientsObserved/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs11){
if(typeof data5 == "number"){
if(data5 < 0 || isNaN(data5)){
validate26.errors = [{instancePath:instancePath+"/clientsObserved",schemaPath:"#/properties/clientsObserved/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.clientsAssessed !== undefined){
let data6 = data.clientsAssessed;
const _errs13 = errors;
if(!((typeof data6 == "number") && (!(data6 % 1) && !isNaN(data6)))){
validate26.errors = [{instancePath:instancePath+"/clientsAssessed",schemaPath:"#/properties/clientsAssessed/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs13){
if(typeof data6 == "number"){
if(data6 < 0 || isNaN(data6)){
validate26.errors = [{instancePath:instancePath+"/clientsAssessed",schemaPath:"#/properties/clientsAssessed/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.callSummaryPresent !== undefined){
const _errs15 = errors;
if(typeof data.callSummaryPresent !== "boolean"){
validate26.errors = [{instancePath:instancePath+"/callSummaryPresent",schemaPath:"#/properties/callSummaryPresent/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.limitations !== undefined){
let data8 = data.limitations;
const _errs17 = errors;
if(errors === _errs17){
if(Array.isArray(data8)){
var valid2 = true;
const len1 = data8.length;
for(let i1=0; i1<len1; i1++){
let data9 = data8[i1];
const _errs19 = errors;
if(errors === _errs19){
if(typeof data9 === "string"){
if(func1(data9) > 300){
validate26.errors = [{instancePath:instancePath+"/limitations/" + i1,schemaPath:"#/properties/limitations/items/maxLength",keyword:"maxLength",params:{limit: 300},message:"must NOT have more than 300 characters"}];
return false;
}
}
else {
validate26.errors = [{instancePath:instancePath+"/limitations/" + i1,schemaPath:"#/properties/limitations/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid2 = _errs19 === errors;
if(!valid2){
break;
}
}
}
else {
validate26.errors = [{instancePath:instancePath+"/limitations",schemaPath:"#/properties/limitations/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
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

const schema44 = {"type":"object","additionalProperties":false,"required":["id","counts"],"properties":{"id":{"type":"string","minLength":1},"counts":{"$ref":"common.json#/$defs/outcomeCounts"},"failedSeconds":{"type":["number","null"],"minimum":0}}};
const schema45 = {"type":"object","additionalProperties":false,"required":["passed","failed","notAssessable","notApplicable","evaluated"],"properties":{"passed":{"type":"integer","minimum":0},"failed":{"type":"integer","minimum":0},"notAssessable":{"type":"integer","minimum":0},"notApplicable":{"type":"integer","minimum":0},"evaluated":{"type":"integer","minimum":0}}};

function validate30(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate30.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.id === undefined) && (missing0 = "id")) || ((data.counts === undefined) && (missing0 = "counts"))){
validate30.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((key0 === "id") || (key0 === "counts")) || (key0 === "failedSeconds"))){
validate30.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.id !== undefined){
let data0 = data.id;
const _errs2 = errors;
if(errors === _errs2){
if(typeof data0 === "string"){
if(func1(data0) < 1){
validate30.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate30.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.counts !== undefined){
let data1 = data.counts;
const _errs4 = errors;
const _errs5 = errors;
if(errors === _errs5){
if(data1 && typeof data1 == "object" && !Array.isArray(data1)){
let missing1;
if((((((data1.passed === undefined) && (missing1 = "passed")) || ((data1.failed === undefined) && (missing1 = "failed"))) || ((data1.notAssessable === undefined) && (missing1 = "notAssessable"))) || ((data1.notApplicable === undefined) && (missing1 = "notApplicable"))) || ((data1.evaluated === undefined) && (missing1 = "evaluated"))){
validate30.errors = [{instancePath:instancePath+"/counts",schemaPath:"common.json#/$defs/outcomeCounts/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs7 = errors;
for(const key1 in data1){
if(!(((((key1 === "passed") || (key1 === "failed")) || (key1 === "notAssessable")) || (key1 === "notApplicable")) || (key1 === "evaluated"))){
validate30.errors = [{instancePath:instancePath+"/counts",schemaPath:"common.json#/$defs/outcomeCounts/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs7 === errors){
if(data1.passed !== undefined){
let data2 = data1.passed;
const _errs8 = errors;
if(!((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2)))){
validate30.errors = [{instancePath:instancePath+"/counts/passed",schemaPath:"common.json#/$defs/outcomeCounts/properties/passed/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs8){
if(typeof data2 == "number"){
if(data2 < 0 || isNaN(data2)){
validate30.errors = [{instancePath:instancePath+"/counts/passed",schemaPath:"common.json#/$defs/outcomeCounts/properties/passed/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid2 = _errs8 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data1.failed !== undefined){
let data3 = data1.failed;
const _errs10 = errors;
if(!((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3)))){
validate30.errors = [{instancePath:instancePath+"/counts/failed",schemaPath:"common.json#/$defs/outcomeCounts/properties/failed/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs10){
if(typeof data3 == "number"){
if(data3 < 0 || isNaN(data3)){
validate30.errors = [{instancePath:instancePath+"/counts/failed",schemaPath:"common.json#/$defs/outcomeCounts/properties/failed/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid2 = _errs10 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data1.notAssessable !== undefined){
let data4 = data1.notAssessable;
const _errs12 = errors;
if(!((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4)))){
validate30.errors = [{instancePath:instancePath+"/counts/notAssessable",schemaPath:"common.json#/$defs/outcomeCounts/properties/notAssessable/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs12){
if(typeof data4 == "number"){
if(data4 < 0 || isNaN(data4)){
validate30.errors = [{instancePath:instancePath+"/counts/notAssessable",schemaPath:"common.json#/$defs/outcomeCounts/properties/notAssessable/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid2 = _errs12 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data1.notApplicable !== undefined){
let data5 = data1.notApplicable;
const _errs14 = errors;
if(!((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5)))){
validate30.errors = [{instancePath:instancePath+"/counts/notApplicable",schemaPath:"common.json#/$defs/outcomeCounts/properties/notApplicable/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs14){
if(typeof data5 == "number"){
if(data5 < 0 || isNaN(data5)){
validate30.errors = [{instancePath:instancePath+"/counts/notApplicable",schemaPath:"common.json#/$defs/outcomeCounts/properties/notApplicable/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid2 = _errs14 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data1.evaluated !== undefined){
let data6 = data1.evaluated;
const _errs16 = errors;
if(!((typeof data6 == "number") && (!(data6 % 1) && !isNaN(data6)))){
validate30.errors = [{instancePath:instancePath+"/counts/evaluated",schemaPath:"common.json#/$defs/outcomeCounts/properties/evaluated/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs16){
if(typeof data6 == "number"){
if(data6 < 0 || isNaN(data6)){
validate30.errors = [{instancePath:instancePath+"/counts/evaluated",schemaPath:"common.json#/$defs/outcomeCounts/properties/evaluated/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid2 = _errs16 === errors;
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
}
else {
validate30.errors = [{instancePath:instancePath+"/counts",schemaPath:"common.json#/$defs/outcomeCounts/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.failedSeconds !== undefined){
let data7 = data.failedSeconds;
const _errs18 = errors;
if((!(typeof data7 == "number")) && (data7 !== null)){
validate30.errors = [{instancePath:instancePath+"/failedSeconds",schemaPath:"#/properties/failedSeconds/type",keyword:"type",params:{type: schema44.properties.failedSeconds.type},message:"must be number,null"}];
return false;
}
if(errors === _errs18){
if(typeof data7 == "number"){
if(data7 < 0 || isNaN(data7)){
validate30.errors = [{instancePath:instancePath+"/failedSeconds",schemaPath:"#/properties/failedSeconds/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid0 = _errs18 === errors;
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
validate30.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate30.errors = vErrors;
return errors === 0;
}
validate30.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema46 = {"type":"object","additionalProperties":false,"required":["clientId","coverage","checks"],"properties":{"clientId":{"type":"string","minLength":1},"displayName":{"type":"string"},"coverage":{"$ref":"common.json#/$defs/coverage"},"classification":{"$ref":"#/$defs/classification"},"checks":{"type":"array","items":{"$ref":"#/$defs/clientCheck"}}}};
const schema52 = {"enum":["qoe-symptom","qos-only","no-issue-within-coverage","insufficient-evidence"]};
const schema47 = {"type":"object","additionalProperties":false,"required":["observedSeconds","assessedSeconds","unassessedSeconds"],"properties":{"observedSeconds":{"type":"number","minimum":0},"assessedSeconds":{"type":"number","minimum":0},"unassessedSeconds":{"type":"number","minimum":0},"gaps":{"type":"array","items":{"$ref":"#/$defs/gap"}}}};

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
let missing0;
if((((data.from === undefined) && (missing0 = "from")) || ((data.to === undefined) && (missing0 = "to"))) || ((data.reason === undefined) && (missing0 = "reason"))){
validate34.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((key0 === "from") || (key0 === "to")) || (key0 === "reason"))){
validate34.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.from !== undefined){
let data0 = data.from;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(errors === _errs3){
if(typeof data0 === "string"){
if(!pattern4.test(data0)){
validate34.errors = [{instancePath:instancePath+"/from",schemaPath:"#/$defs/instant/pattern",keyword:"pattern",params:{pattern: "Z$"},message:"must match pattern \""+"Z$"+"\""}];
return false;
}
}
else {
validate34.errors = [{instancePath:instancePath+"/from",schemaPath:"#/$defs/instant/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.to !== undefined){
let data1 = data.to;
const _errs5 = errors;
const _errs6 = errors;
if(errors === _errs6){
if(errors === _errs6){
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
validate34.errors = [{instancePath:instancePath+"/to",schemaPath:"#/$defs/instant/pattern",keyword:"pattern",params:{pattern: "Z$"},message:"must match pattern \""+"Z$"+"\""}];
return false;
}
}
else {
validate34.errors = [{instancePath:instancePath+"/to",schemaPath:"#/$defs/instant/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.reason !== undefined){
let data2 = data.reason;
const _errs8 = errors;
if(!(((((data2 === "stats-collection-gap") || (data2 === "tab-hidden")) || (data2 === "before-first-sample")) || (data2 === "after-last-sample")) || (data2 === "counter-reset"))){
validate34.errors = [{instancePath:instancePath+"/reason",schemaPath:"#/$defs/gapReason/enum",keyword:"enum",params:{allowedValues: schema43.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs8 === errors;
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
validate34.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate34.errors = vErrors;
return errors === 0;
}
validate34.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate33(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate33.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.observedSeconds === undefined) && (missing0 = "observedSeconds")) || ((data.assessedSeconds === undefined) && (missing0 = "assessedSeconds"))) || ((data.unassessedSeconds === undefined) && (missing0 = "unassessedSeconds"))){
validate33.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "observedSeconds") || (key0 === "assessedSeconds")) || (key0 === "unassessedSeconds")) || (key0 === "gaps"))){
validate33.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.observedSeconds !== undefined){
let data0 = data.observedSeconds;
const _errs2 = errors;
if(errors === _errs2){
if(typeof data0 == "number"){
if(data0 < 0 || isNaN(data0)){
validate33.errors = [{instancePath:instancePath+"/observedSeconds",schemaPath:"#/properties/observedSeconds/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
else {
validate33.errors = [{instancePath:instancePath+"/observedSeconds",schemaPath:"#/properties/observedSeconds/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.assessedSeconds !== undefined){
let data1 = data.assessedSeconds;
const _errs4 = errors;
if(errors === _errs4){
if(typeof data1 == "number"){
if(data1 < 0 || isNaN(data1)){
validate33.errors = [{instancePath:instancePath+"/assessedSeconds",schemaPath:"#/properties/assessedSeconds/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
else {
validate33.errors = [{instancePath:instancePath+"/assessedSeconds",schemaPath:"#/properties/assessedSeconds/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.unassessedSeconds !== undefined){
let data2 = data.unassessedSeconds;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data2 == "number"){
if(data2 < 0 || isNaN(data2)){
validate33.errors = [{instancePath:instancePath+"/unassessedSeconds",schemaPath:"#/properties/unassessedSeconds/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
else {
validate33.errors = [{instancePath:instancePath+"/unassessedSeconds",schemaPath:"#/properties/unassessedSeconds/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.gaps !== undefined){
let data3 = data.gaps;
const _errs8 = errors;
if(errors === _errs8){
if(Array.isArray(data3)){
var valid1 = true;
const len0 = data3.length;
for(let i0=0; i0<len0; i0++){
const _errs10 = errors;
if(!(validate34(data3[i0], {instancePath:instancePath+"/gaps/" + i0,parentData:data3,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate34.errors : vErrors.concat(validate34.errors);
errors = vErrors.length;
}
var valid1 = _errs10 === errors;
if(!valid1){
break;
}
}
}
else {
validate33.errors = [{instancePath:instancePath+"/gaps",schemaPath:"#/properties/gaps/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs8 === errors;
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
validate33.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate33.errors = vErrors;
return errors === 0;
}
validate33.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema53 = {"type":"object","additionalProperties":false,"required":["id","outcome"],"properties":{"id":{"type":"string","minLength":1},"outcome":{"$ref":"common.json#/$defs/outcome"},"subject":{"$ref":"common.json#/$defs/subject"},"rule":{"type":"string","maxLength":300},"why":{"type":"string","maxLength":300},"observed":{"type":"array","items":{"$ref":"common.json#/$defs/observedValue"}},"interval":{"$ref":"common.json#/$defs/interval"},"issues":{"type":"array","items":{"$ref":"common.json#/$defs/issueRef"}},"events":{"type":"array","items":{"$ref":"common.json#/$defs/eventRef"}},"evidence":{"type":"array","items":{"$ref":"common.json#/$defs/evidenceRef"}}}};
const schema54 = {"enum":["passed","failed","not-assessable","not-applicable"]};
const func7 = Object.prototype.hasOwnProperty;
const schema55 = {"type":"object","additionalProperties":false,"required":["kind"],"properties":{"kind":{"$ref":"#/$defs/subjectKind"},"id":{"type":"string","minLength":1},"media":{"enum":["audio","video"]}}};
const schema56 = {"enum":["client","peer-connection","inbound-track","outbound-track"]};

function validate38(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate38.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.kind === undefined) && (missing0 = "kind")){
validate38.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((key0 === "kind") || (key0 === "id")) || (key0 === "media"))){
validate38.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
let data0 = data.kind;
const _errs2 = errors;
if(!((((data0 === "client") || (data0 === "peer-connection")) || (data0 === "inbound-track")) || (data0 === "outbound-track"))){
validate38.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/$defs/subjectKind/enum",keyword:"enum",params:{allowedValues: schema56.enum},message:"must be equal to one of the allowed values"}];
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
if(errors === _errs4){
if(typeof data1 === "string"){
if(func1(data1) < 1){
validate38.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate38.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.media !== undefined){
let data2 = data.media;
const _errs6 = errors;
if(!((data2 === "audio") || (data2 === "video"))){
validate38.errors = [{instancePath:instancePath+"/media",schemaPath:"#/properties/media/enum",keyword:"enum",params:{allowedValues: schema55.properties.media.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs6 === errors;
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
validate38.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate38.errors = vErrors;
return errors === 0;
}
validate38.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema57 = {"type":"object","additionalProperties":false,"required":["label","value","unit"],"properties":{"label":{"type":"string","minLength":1,"maxLength":80},"value":{"type":["number","string","null"]},"unit":{"$ref":"#/$defs/unit"},"threshold":{"type":["number","null"]}}};
const schema58 = {"enum":["count","ms","s","bps","bytes","fraction","percent","fps","pixels","dBov","none"]};

function validate40(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate40.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.label === undefined) && (missing0 = "label")) || ((data.value === undefined) && (missing0 = "value"))) || ((data.unit === undefined) && (missing0 = "unit"))){
validate40.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "label") || (key0 === "value")) || (key0 === "unit")) || (key0 === "threshold"))){
validate40.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.label !== undefined){
let data0 = data.label;
const _errs2 = errors;
if(errors === _errs2){
if(typeof data0 === "string"){
if(func1(data0) > 80){
validate40.errors = [{instancePath:instancePath+"/label",schemaPath:"#/properties/label/maxLength",keyword:"maxLength",params:{limit: 80},message:"must NOT have more than 80 characters"}];
return false;
}
else {
if(func1(data0) < 1){
validate40.errors = [{instancePath:instancePath+"/label",schemaPath:"#/properties/label/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate40.errors = [{instancePath:instancePath+"/label",schemaPath:"#/properties/label/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
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
if(((!(typeof data1 == "number")) && (typeof data1 !== "string")) && (data1 !== null)){
validate40.errors = [{instancePath:instancePath+"/value",schemaPath:"#/properties/value/type",keyword:"type",params:{type: schema57.properties.value.type},message:"must be number,string,null"}];
return false;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.unit !== undefined){
let data2 = data.unit;
const _errs6 = errors;
if(!(((((((((((data2 === "count") || (data2 === "ms")) || (data2 === "s")) || (data2 === "bps")) || (data2 === "bytes")) || (data2 === "fraction")) || (data2 === "percent")) || (data2 === "fps")) || (data2 === "pixels")) || (data2 === "dBov")) || (data2 === "none"))){
validate40.errors = [{instancePath:instancePath+"/unit",schemaPath:"#/$defs/unit/enum",keyword:"enum",params:{allowedValues: schema58.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.threshold !== undefined){
let data3 = data.threshold;
const _errs8 = errors;
if((!(typeof data3 == "number")) && (data3 !== null)){
validate40.errors = [{instancePath:instancePath+"/threshold",schemaPath:"#/properties/threshold/type",keyword:"type",params:{type: schema57.properties.threshold.type},message:"must be number,null"}];
return false;
}
var valid0 = _errs8 === errors;
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
validate40.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate40.errors = vErrors;
return errors === 0;
}
validate40.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema59 = {"type":"object","additionalProperties":false,"required":["from","to"],"properties":{"from":{"$ref":"#/$defs/instant"},"to":{"$ref":"#/$defs/instant"}}};

function validate42(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate42.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.from === undefined) && (missing0 = "from")) || ((data.to === undefined) && (missing0 = "to"))){
validate42.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((key0 === "from") || (key0 === "to"))){
validate42.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.from !== undefined){
let data0 = data.from;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(errors === _errs3){
if(typeof data0 === "string"){
if(!pattern4.test(data0)){
validate42.errors = [{instancePath:instancePath+"/from",schemaPath:"#/$defs/instant/pattern",keyword:"pattern",params:{pattern: "Z$"},message:"must match pattern \""+"Z$"+"\""}];
return false;
}
}
else {
validate42.errors = [{instancePath:instancePath+"/from",schemaPath:"#/$defs/instant/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.to !== undefined){
let data1 = data.to;
const _errs5 = errors;
const _errs6 = errors;
if(errors === _errs6){
if(errors === _errs6){
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
validate42.errors = [{instancePath:instancePath+"/to",schemaPath:"#/$defs/instant/pattern",keyword:"pattern",params:{pattern: "Z$"},message:"must match pattern \""+"Z$"+"\""}];
return false;
}
}
else {
validate42.errors = [{instancePath:instancePath+"/to",schemaPath:"#/$defs/instant/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
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
validate42.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate42.errors = vErrors;
return errors === 0;
}
validate42.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema62 = {"type":"object","additionalProperties":false,"required":["type","at"],"properties":{"type":{"type":"string","minLength":1},"at":{"$ref":"#/$defs/instant"},"payload":{"type":"object","additionalProperties":true}}};

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
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.type === undefined) && (missing0 = "type")) || ((data.at === undefined) && (missing0 = "at"))){
validate44.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((key0 === "type") || (key0 === "at")) || (key0 === "payload"))){
validate44.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.type !== undefined){
let data0 = data.type;
const _errs2 = errors;
if(errors === _errs2){
if(typeof data0 === "string"){
if(func1(data0) < 1){
validate44.errors = [{instancePath:instancePath+"/type",schemaPath:"#/properties/type/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate44.errors = [{instancePath:instancePath+"/type",schemaPath:"#/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"}];
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
const _errs4 = errors;
const _errs5 = errors;
if(errors === _errs5){
if(errors === _errs5){
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
validate44.errors = [{instancePath:instancePath+"/at",schemaPath:"#/$defs/instant/pattern",keyword:"pattern",params:{pattern: "Z$"},message:"must match pattern \""+"Z$"+"\""}];
return false;
}
}
else {
validate44.errors = [{instancePath:instancePath+"/at",schemaPath:"#/$defs/instant/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.payload !== undefined){
let data2 = data.payload;
const _errs7 = errors;
if(errors === _errs7){
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
}
else {
validate44.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/properties/payload/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
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
validate44.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate44.errors = vErrors;
return errors === 0;
}
validate44.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema64 = {"type":"object","additionalProperties":false,"required":["type","at"],"properties":{"type":{"type":"string","minLength":1},"at":{"$ref":"#/$defs/instant"},"payload":{"type":"object","additionalProperties":true}}};

function validate46(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate46.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.type === undefined) && (missing0 = "type")) || ((data.at === undefined) && (missing0 = "at"))){
validate46.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((key0 === "type") || (key0 === "at")) || (key0 === "payload"))){
validate46.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.type !== undefined){
let data0 = data.type;
const _errs2 = errors;
if(errors === _errs2){
if(typeof data0 === "string"){
if(func1(data0) < 1){
validate46.errors = [{instancePath:instancePath+"/type",schemaPath:"#/properties/type/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate46.errors = [{instancePath:instancePath+"/type",schemaPath:"#/properties/type/type",keyword:"type",params:{type: "string"},message:"must be string"}];
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
const _errs4 = errors;
const _errs5 = errors;
if(errors === _errs5){
if(errors === _errs5){
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
validate46.errors = [{instancePath:instancePath+"/at",schemaPath:"#/$defs/instant/pattern",keyword:"pattern",params:{pattern: "Z$"},message:"must match pattern \""+"Z$"+"\""}];
return false;
}
}
else {
validate46.errors = [{instancePath:instancePath+"/at",schemaPath:"#/$defs/instant/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.payload !== undefined){
let data2 = data.payload;
const _errs7 = errors;
if(errors === _errs7){
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
}
else {
validate46.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/properties/payload/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
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
validate46.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate46.errors = vErrors;
return errors === 0;
}
validate46.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema66 = {"type":"object","additionalProperties":false,"required":["target"],"properties":{"target":{"$ref":"#/$defs/evidenceTarget"},"id":{"type":"string","minLength":1},"chart":{"type":"string","minLength":1},"interval":{"$ref":"#/$defs/interval"}}};
const schema67 = {"enum":["consumer","producer","transport","session","samples","client"]};

function validate49(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate49.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.from === undefined) && (missing0 = "from")) || ((data.to === undefined) && (missing0 = "to"))){
validate49.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((key0 === "from") || (key0 === "to"))){
validate49.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.from !== undefined){
let data0 = data.from;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(errors === _errs3){
if(typeof data0 === "string"){
if(!pattern4.test(data0)){
validate49.errors = [{instancePath:instancePath+"/from",schemaPath:"#/$defs/instant/pattern",keyword:"pattern",params:{pattern: "Z$"},message:"must match pattern \""+"Z$"+"\""}];
return false;
}
}
else {
validate49.errors = [{instancePath:instancePath+"/from",schemaPath:"#/$defs/instant/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.to !== undefined){
let data1 = data.to;
const _errs5 = errors;
const _errs6 = errors;
if(errors === _errs6){
if(errors === _errs6){
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
validate49.errors = [{instancePath:instancePath+"/to",schemaPath:"#/$defs/instant/pattern",keyword:"pattern",params:{pattern: "Z$"},message:"must match pattern \""+"Z$"+"\""}];
return false;
}
}
else {
validate49.errors = [{instancePath:instancePath+"/to",schemaPath:"#/$defs/instant/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
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
validate49.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate49.errors = vErrors;
return errors === 0;
}
validate49.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate48(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate48.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.target === undefined) && (missing0 = "target")){
validate48.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "target") || (key0 === "id")) || (key0 === "chart")) || (key0 === "interval"))){
validate48.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.target !== undefined){
let data0 = data.target;
const _errs2 = errors;
if(!((((((data0 === "consumer") || (data0 === "producer")) || (data0 === "transport")) || (data0 === "session")) || (data0 === "samples")) || (data0 === "client"))){
validate48.errors = [{instancePath:instancePath+"/target",schemaPath:"#/$defs/evidenceTarget/enum",keyword:"enum",params:{allowedValues: schema67.enum},message:"must be equal to one of the allowed values"}];
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
if(errors === _errs4){
if(typeof data1 === "string"){
if(func1(data1) < 1){
validate48.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate48.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.chart !== undefined){
let data2 = data.chart;
const _errs6 = errors;
if(errors === _errs6){
if(typeof data2 === "string"){
if(func1(data2) < 1){
validate48.errors = [{instancePath:instancePath+"/chart",schemaPath:"#/properties/chart/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate48.errors = [{instancePath:instancePath+"/chart",schemaPath:"#/properties/chart/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.interval !== undefined){
const _errs8 = errors;
if(!(validate49(data.interval, {instancePath:instancePath+"/interval",parentData:data,parentDataProperty:"interval",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate49.errors : vErrors.concat(validate49.errors);
errors = vErrors.length;
}
var valid0 = _errs8 === errors;
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
validate48.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate48.errors = vErrors;
return errors === 0;
}
validate48.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate37(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate37.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.id === undefined) && (missing0 = "id")) || ((data.outcome === undefined) && (missing0 = "outcome"))){
validate37.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(func7.call(schema53.properties, key0))){
validate37.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.id !== undefined){
let data0 = data.id;
const _errs2 = errors;
if(errors === _errs2){
if(typeof data0 === "string"){
if(func1(data0) < 1){
validate37.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate37.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.outcome !== undefined){
let data1 = data.outcome;
const _errs4 = errors;
if(!((((data1 === "passed") || (data1 === "failed")) || (data1 === "not-assessable")) || (data1 === "not-applicable"))){
validate37.errors = [{instancePath:instancePath+"/outcome",schemaPath:"common.json#/$defs/outcome/enum",keyword:"enum",params:{allowedValues: schema54.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.subject !== undefined){
const _errs6 = errors;
if(!(validate38(data.subject, {instancePath:instancePath+"/subject",parentData:data,parentDataProperty:"subject",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate38.errors : vErrors.concat(validate38.errors);
errors = vErrors.length;
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.rule !== undefined){
let data3 = data.rule;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data3 === "string"){
if(func1(data3) > 300){
validate37.errors = [{instancePath:instancePath+"/rule",schemaPath:"#/properties/rule/maxLength",keyword:"maxLength",params:{limit: 300},message:"must NOT have more than 300 characters"}];
return false;
}
}
else {
validate37.errors = [{instancePath:instancePath+"/rule",schemaPath:"#/properties/rule/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.why !== undefined){
let data4 = data.why;
const _errs9 = errors;
if(errors === _errs9){
if(typeof data4 === "string"){
if(func1(data4) > 300){
validate37.errors = [{instancePath:instancePath+"/why",schemaPath:"#/properties/why/maxLength",keyword:"maxLength",params:{limit: 300},message:"must NOT have more than 300 characters"}];
return false;
}
}
else {
validate37.errors = [{instancePath:instancePath+"/why",schemaPath:"#/properties/why/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.observed !== undefined){
let data5 = data.observed;
const _errs11 = errors;
if(errors === _errs11){
if(Array.isArray(data5)){
var valid2 = true;
const len0 = data5.length;
for(let i0=0; i0<len0; i0++){
const _errs13 = errors;
if(!(validate40(data5[i0], {instancePath:instancePath+"/observed/" + i0,parentData:data5,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate40.errors : vErrors.concat(validate40.errors);
errors = vErrors.length;
}
var valid2 = _errs13 === errors;
if(!valid2){
break;
}
}
}
else {
validate37.errors = [{instancePath:instancePath+"/observed",schemaPath:"#/properties/observed/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.interval !== undefined){
const _errs14 = errors;
if(!(validate42(data.interval, {instancePath:instancePath+"/interval",parentData:data,parentDataProperty:"interval",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate42.errors : vErrors.concat(validate42.errors);
errors = vErrors.length;
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.issues !== undefined){
let data8 = data.issues;
const _errs15 = errors;
if(errors === _errs15){
if(Array.isArray(data8)){
var valid3 = true;
const len1 = data8.length;
for(let i1=0; i1<len1; i1++){
const _errs17 = errors;
if(!(validate44(data8[i1], {instancePath:instancePath+"/issues/" + i1,parentData:data8,parentDataProperty:i1,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate44.errors : vErrors.concat(validate44.errors);
errors = vErrors.length;
}
var valid3 = _errs17 === errors;
if(!valid3){
break;
}
}
}
else {
validate37.errors = [{instancePath:instancePath+"/issues",schemaPath:"#/properties/issues/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.events !== undefined){
let data10 = data.events;
const _errs18 = errors;
if(errors === _errs18){
if(Array.isArray(data10)){
var valid4 = true;
const len2 = data10.length;
for(let i2=0; i2<len2; i2++){
const _errs20 = errors;
if(!(validate46(data10[i2], {instancePath:instancePath+"/events/" + i2,parentData:data10,parentDataProperty:i2,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
errors = vErrors.length;
}
var valid4 = _errs20 === errors;
if(!valid4){
break;
}
}
}
else {
validate37.errors = [{instancePath:instancePath+"/events",schemaPath:"#/properties/events/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs18 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.evidence !== undefined){
let data12 = data.evidence;
const _errs21 = errors;
if(errors === _errs21){
if(Array.isArray(data12)){
var valid5 = true;
const len3 = data12.length;
for(let i3=0; i3<len3; i3++){
const _errs23 = errors;
if(!(validate48(data12[i3], {instancePath:instancePath+"/evidence/" + i3,parentData:data12,parentDataProperty:i3,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate48.errors : vErrors.concat(validate48.errors);
errors = vErrors.length;
}
var valid5 = _errs23 === errors;
if(!valid5){
break;
}
}
}
else {
validate37.errors = [{instancePath:instancePath+"/evidence",schemaPath:"#/properties/evidence/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs21 === errors;
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
validate37.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate37.errors = vErrors;
return errors === 0;
}
validate37.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate32(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate32.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.clientId === undefined) && (missing0 = "clientId")) || ((data.coverage === undefined) && (missing0 = "coverage"))) || ((data.checks === undefined) && (missing0 = "checks"))){
validate32.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((key0 === "clientId") || (key0 === "displayName")) || (key0 === "coverage")) || (key0 === "classification")) || (key0 === "checks"))){
validate32.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.clientId !== undefined){
let data0 = data.clientId;
const _errs2 = errors;
if(errors === _errs2){
if(typeof data0 === "string"){
if(func1(data0) < 1){
validate32.errors = [{instancePath:instancePath+"/clientId",schemaPath:"#/properties/clientId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate32.errors = [{instancePath:instancePath+"/clientId",schemaPath:"#/properties/clientId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.displayName !== undefined){
const _errs4 = errors;
if(typeof data.displayName !== "string"){
validate32.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/properties/displayName/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.coverage !== undefined){
const _errs6 = errors;
if(!(validate33(data.coverage, {instancePath:instancePath+"/coverage",parentData:data,parentDataProperty:"coverage",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate33.errors : vErrors.concat(validate33.errors);
errors = vErrors.length;
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.classification !== undefined){
let data3 = data.classification;
const _errs7 = errors;
if(!((((data3 === "qoe-symptom") || (data3 === "qos-only")) || (data3 === "no-issue-within-coverage")) || (data3 === "insufficient-evidence"))){
validate32.errors = [{instancePath:instancePath+"/classification",schemaPath:"#/$defs/classification/enum",keyword:"enum",params:{allowedValues: schema52.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.checks !== undefined){
let data4 = data.checks;
const _errs9 = errors;
if(errors === _errs9){
if(Array.isArray(data4)){
var valid2 = true;
const len0 = data4.length;
for(let i0=0; i0<len0; i0++){
const _errs11 = errors;
if(!(validate37(data4[i0], {instancePath:instancePath+"/checks/" + i0,parentData:data4,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate37.errors : vErrors.concat(validate37.errors);
errors = vErrors.length;
}
var valid2 = _errs11 === errors;
if(!valid2){
break;
}
}
}
else {
validate32.errors = [{instancePath:instancePath+"/checks",schemaPath:"#/properties/checks/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs9 === errors;
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
validate32.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate32.errors = vErrors;
return errors === 0;
}
validate32.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate20(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="https://schemas.observertc.org/digest/v2/call-digest.json" */;
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
if((((((data.provenance === undefined) && (missing0 = "provenance")) || ((data.call === undefined) && (missing0 = "call"))) || ((data.coverage === undefined) && (missing0 = "coverage"))) || ((data.checks === undefined) && (missing0 = "checks"))) || ((data.clients === undefined) && (missing0 = "clients"))){
validate20.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((key0 === "provenance") || (key0 === "call")) || (key0 === "coverage")) || (key0 === "checks")) || (key0 === "clients"))){
validate20.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.provenance !== undefined){
const _errs2 = errors;
if(!(validate22(data.provenance, {instancePath:instancePath+"/provenance",parentData:data,parentDataProperty:"provenance",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate22.errors : vErrors.concat(validate22.errors);
errors = vErrors.length;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.call !== undefined){
const _errs3 = errors;
if(!(validate24(data.call, {instancePath:instancePath+"/call",parentData:data,parentDataProperty:"call",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate24.errors : vErrors.concat(validate24.errors);
errors = vErrors.length;
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.coverage !== undefined){
const _errs4 = errors;
if(!(validate26(data.coverage, {instancePath:instancePath+"/coverage",parentData:data,parentDataProperty:"coverage",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate26.errors : vErrors.concat(validate26.errors);
errors = vErrors.length;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.checks !== undefined){
let data3 = data.checks;
const _errs5 = errors;
if(errors === _errs5){
if(Array.isArray(data3)){
var valid1 = true;
const len0 = data3.length;
for(let i0=0; i0<len0; i0++){
const _errs7 = errors;
if(!(validate30(data3[i0], {instancePath:instancePath+"/checks/" + i0,parentData:data3,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate30.errors : vErrors.concat(validate30.errors);
errors = vErrors.length;
}
var valid1 = _errs7 === errors;
if(!valid1){
break;
}
}
}
else {
validate20.errors = [{instancePath:instancePath+"/checks",schemaPath:"#/properties/checks/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.clients !== undefined){
let data5 = data.clients;
const _errs8 = errors;
if(errors === _errs8){
if(Array.isArray(data5)){
var valid2 = true;
const len1 = data5.length;
for(let i1=0; i1<len1; i1++){
const _errs10 = errors;
if(!(validate32(data5[i1], {instancePath:instancePath+"/clients/" + i1,parentData:data5,parentDataProperty:i1,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate32.errors : vErrors.concat(validate32.errors);
errors = vErrors.length;
}
var valid2 = _errs10 === errors;
if(!valid2){
break;
}
}
}
else {
validate20.errors = [{instancePath:instancePath+"/clients",schemaPath:"#/properties/clients/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs8 === errors;
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
validate20.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate20.errors = vErrors;
return errors === 0;
}
validate20.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const validatePeriodSummary = validate54;
const schema71 = {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://schemas.observertc.org/digest/v2/period-summary.json","type":"object","additionalProperties":false,"required":["provenance","period","sources","totals","checks"],"properties":{"provenance":{"$ref":"common.json#/$defs/provenance"},"period":{"$ref":"#/$defs/period"},"sources":{"$ref":"#/$defs/sources"},"totals":{"$ref":"#/$defs/totals"},"checks":{"type":"array","items":{"$ref":"#/$defs/periodCheck"}},"classification":{"$ref":"#/$defs/classificationCounts"},"trend":{"$ref":"#/$defs/trend"},"affected":{"type":"array","items":{"$ref":"#/$defs/affectedByCheck"}}},"$defs":{"period":{"type":"object","additionalProperties":false,"required":["kind","id","timezone"],"properties":{"kind":{"enum":["day","month"]},"id":{"type":"string","pattern":"^[0-9]{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01]))?$"},"timezone":{"const":"UTC"},"provisional":{"type":"boolean"}}},"sources":{"type":"object","additionalProperties":false,"required":["kind","found","read","failed","complete"],"properties":{"kind":{"enum":["calls","days"]},"found":{"type":"integer","minimum":0},"read":{"type":"integer","minimum":0},"failed":{"type":"integer","minimum":0},"complete":{"type":"boolean"},"failures":{"type":"array","items":{"$ref":"#/$defs/sourceFailure"}},"missingDays":{"type":"array","items":{"$ref":"common.json#/$defs/reportingDay"}}}},"sourceFailure":{"type":"object","additionalProperties":false,"required":["id","reason"],"properties":{"id":{"type":"string","minLength":1},"reason":{"enum":["not-found","invalid-json","schema-invalid","unsupported-schema-version","read-failed"]},"detail":{"type":"string","maxLength":300}}},"totals":{"type":"object","additionalProperties":false,"required":["calls","clientSessions","clientSessionsAssessed"],"properties":{"calls":{"type":"integer","minimum":0},"clientSessions":{"type":"integer","minimum":0},"clientSessionsAssessed":{"type":"integer","minimum":0},"observedSeconds":{"type":"number","minimum":0},"assessedSeconds":{"type":"number","minimum":0},"unassessedSeconds":{"type":"number","minimum":0},"callSeconds":{"type":"number","minimum":0}}},"periodCheck":{"type":"object","additionalProperties":false,"required":["id","counts"],"properties":{"id":{"type":"string","minLength":1},"counts":{"$ref":"common.json#/$defs/outcomeCounts"},"callsAffected":{"type":"integer","minimum":0},"failedSeconds":{"type":["number","null"],"minimum":0}}},"classificationCounts":{"type":"object","additionalProperties":false,"required":["qoeSymptom","qosOnly","noIssueWithinCoverage","insufficientEvidence"],"properties":{"qoeSymptom":{"type":"integer","minimum":0},"qosOnly":{"type":"integer","minimum":0},"noIssueWithinCoverage":{"type":"integer","minimum":0},"insufficientEvidence":{"type":"integer","minimum":0}}},"trend":{"type":"object","additionalProperties":false,"required":["bucket","buckets"],"properties":{"bucket":{"enum":["hour","day"]},"buckets":{"type":"array","items":{"$ref":"#/$defs/trendBucket"}}}},"trendBucket":{"type":"object","additionalProperties":false,"required":["at","clientSessions","clientSessionsFailed"],"properties":{"at":{"$ref":"common.json#/$defs/instant"},"clientSessions":{"type":"integer","minimum":0},"clientSessionsFailed":{"type":"integer","minimum":0},"clientSessionsAssessed":{"type":"integer","minimum":0}}},"affectedByCheck":{"type":"object","additionalProperties":false,"required":["id"],"properties":{"id":{"type":"string","minLength":1},"calls":{"type":"array","items":{"$ref":"common.json#/$defs/callRef"}},"clientSessions":{"type":"array","items":{"$ref":"common.json#/$defs/clientSessionRef"}},"truncated":{"type":"boolean"}}}}};
const schema74 = {"type":"object","additionalProperties":false,"required":["kind","id","timezone"],"properties":{"kind":{"enum":["day","month"]},"id":{"type":"string","pattern":"^[0-9]{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01]))?$"},"timezone":{"const":"UTC"},"provisional":{"type":"boolean"}}};
const schema78 = {"type":"object","additionalProperties":false,"required":["calls","clientSessions","clientSessionsAssessed"],"properties":{"calls":{"type":"integer","minimum":0},"clientSessions":{"type":"integer","minimum":0},"clientSessionsAssessed":{"type":"integer","minimum":0},"observedSeconds":{"type":"number","minimum":0},"assessedSeconds":{"type":"number","minimum":0},"unassessedSeconds":{"type":"number","minimum":0},"callSeconds":{"type":"number","minimum":0}}};
const schema81 = {"type":"object","additionalProperties":false,"required":["qoeSymptom","qosOnly","noIssueWithinCoverage","insufficientEvidence"],"properties":{"qoeSymptom":{"type":"integer","minimum":0},"qosOnly":{"type":"integer","minimum":0},"noIssueWithinCoverage":{"type":"integer","minimum":0},"insufficientEvidence":{"type":"integer","minimum":0}}};

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
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.schemaVersion === undefined) && (missing0 = "schemaVersion")) || ((data.rulesVersion === undefined) && (missing0 = "rulesVersion"))) || ((data.generatedAt === undefined) && (missing0 = "generatedAt"))){
validate55.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((key0 === "schemaVersion") || (key0 === "rulesVersion")) || (key0 === "generatedAt"))){
validate55.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.schemaVersion !== undefined){
let data0 = data.schemaVersion;
const _errs2 = errors;
if(!((typeof data0 == "number") && (!(data0 % 1) && !isNaN(data0)))){
validate55.errors = [{instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(2 !== data0){
validate55.errors = [{instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: 2},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.rulesVersion !== undefined){
let data1 = data.rulesVersion;
const _errs4 = errors;
if(errors === _errs4){
if(typeof data1 === "string"){
if(func1(data1) < 1){
validate55.errors = [{instancePath:instancePath+"/rulesVersion",schemaPath:"#/properties/rulesVersion/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate55.errors = [{instancePath:instancePath+"/rulesVersion",schemaPath:"#/properties/rulesVersion/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.generatedAt !== undefined){
let data2 = data.generatedAt;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(errors === _errs7){
if(typeof data2 === "string"){
if(!pattern4.test(data2)){
validate55.errors = [{instancePath:instancePath+"/generatedAt",schemaPath:"#/$defs/instant/pattern",keyword:"pattern",params:{pattern: "Z$"},message:"must match pattern \""+"Z$"+"\""}];
return false;
}
}
else {
validate55.errors = [{instancePath:instancePath+"/generatedAt",schemaPath:"#/$defs/instant/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs6 === errors;
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
validate55.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate55.errors = vErrors;
return errors === 0;
}
validate55.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema75 = {"type":"object","additionalProperties":false,"required":["kind","found","read","failed","complete"],"properties":{"kind":{"enum":["calls","days"]},"found":{"type":"integer","minimum":0},"read":{"type":"integer","minimum":0},"failed":{"type":"integer","minimum":0},"complete":{"type":"boolean"},"failures":{"type":"array","items":{"$ref":"#/$defs/sourceFailure"}},"missingDays":{"type":"array","items":{"$ref":"common.json#/$defs/reportingDay"}}}};
const schema76 = {"type":"object","additionalProperties":false,"required":["id","reason"],"properties":{"id":{"type":"string","minLength":1},"reason":{"enum":["not-found","invalid-json","schema-invalid","unsupported-schema-version","read-failed"]},"detail":{"type":"string","maxLength":300}}};

function validate57(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate57.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.kind === undefined) && (missing0 = "kind")) || ((data.found === undefined) && (missing0 = "found"))) || ((data.read === undefined) && (missing0 = "read"))) || ((data.failed === undefined) && (missing0 = "failed"))) || ((data.complete === undefined) && (missing0 = "complete"))){
validate57.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((((key0 === "kind") || (key0 === "found")) || (key0 === "read")) || (key0 === "failed")) || (key0 === "complete")) || (key0 === "failures")) || (key0 === "missingDays"))){
validate57.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.kind !== undefined){
let data0 = data.kind;
const _errs2 = errors;
if(!((data0 === "calls") || (data0 === "days"))){
validate57.errors = [{instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/enum",keyword:"enum",params:{allowedValues: schema75.properties.kind.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.found !== undefined){
let data1 = data.found;
const _errs3 = errors;
if(!((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1)))){
validate57.errors = [{instancePath:instancePath+"/found",schemaPath:"#/properties/found/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs3){
if(typeof data1 == "number"){
if(data1 < 0 || isNaN(data1)){
validate57.errors = [{instancePath:instancePath+"/found",schemaPath:"#/properties/found/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.read !== undefined){
let data2 = data.read;
const _errs5 = errors;
if(!((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2)))){
validate57.errors = [{instancePath:instancePath+"/read",schemaPath:"#/properties/read/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs5){
if(typeof data2 == "number"){
if(data2 < 0 || isNaN(data2)){
validate57.errors = [{instancePath:instancePath+"/read",schemaPath:"#/properties/read/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.failed !== undefined){
let data3 = data.failed;
const _errs7 = errors;
if(!((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3)))){
validate57.errors = [{instancePath:instancePath+"/failed",schemaPath:"#/properties/failed/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs7){
if(typeof data3 == "number"){
if(data3 < 0 || isNaN(data3)){
validate57.errors = [{instancePath:instancePath+"/failed",schemaPath:"#/properties/failed/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.complete !== undefined){
const _errs9 = errors;
if(typeof data.complete !== "boolean"){
validate57.errors = [{instancePath:instancePath+"/complete",schemaPath:"#/properties/complete/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.failures !== undefined){
let data5 = data.failures;
const _errs11 = errors;
if(errors === _errs11){
if(Array.isArray(data5)){
var valid1 = true;
const len0 = data5.length;
for(let i0=0; i0<len0; i0++){
let data6 = data5[i0];
const _errs13 = errors;
const _errs14 = errors;
if(errors === _errs14){
if(data6 && typeof data6 == "object" && !Array.isArray(data6)){
let missing1;
if(((data6.id === undefined) && (missing1 = "id")) || ((data6.reason === undefined) && (missing1 = "reason"))){
validate57.errors = [{instancePath:instancePath+"/failures/" + i0,schemaPath:"#/$defs/sourceFailure/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs16 = errors;
for(const key1 in data6){
if(!(((key1 === "id") || (key1 === "reason")) || (key1 === "detail"))){
validate57.errors = [{instancePath:instancePath+"/failures/" + i0,schemaPath:"#/$defs/sourceFailure/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs16 === errors){
if(data6.id !== undefined){
let data7 = data6.id;
const _errs17 = errors;
if(errors === _errs17){
if(typeof data7 === "string"){
if(func1(data7) < 1){
validate57.errors = [{instancePath:instancePath+"/failures/" + i0+"/id",schemaPath:"#/$defs/sourceFailure/properties/id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate57.errors = [{instancePath:instancePath+"/failures/" + i0+"/id",schemaPath:"#/$defs/sourceFailure/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid3 = _errs17 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data6.reason !== undefined){
let data8 = data6.reason;
const _errs19 = errors;
if(!(((((data8 === "not-found") || (data8 === "invalid-json")) || (data8 === "schema-invalid")) || (data8 === "unsupported-schema-version")) || (data8 === "read-failed"))){
validate57.errors = [{instancePath:instancePath+"/failures/" + i0+"/reason",schemaPath:"#/$defs/sourceFailure/properties/reason/enum",keyword:"enum",params:{allowedValues: schema76.properties.reason.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid3 = _errs19 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data6.detail !== undefined){
let data9 = data6.detail;
const _errs20 = errors;
if(errors === _errs20){
if(typeof data9 === "string"){
if(func1(data9) > 300){
validate57.errors = [{instancePath:instancePath+"/failures/" + i0+"/detail",schemaPath:"#/$defs/sourceFailure/properties/detail/maxLength",keyword:"maxLength",params:{limit: 300},message:"must NOT have more than 300 characters"}];
return false;
}
}
else {
validate57.errors = [{instancePath:instancePath+"/failures/" + i0+"/detail",schemaPath:"#/$defs/sourceFailure/properties/detail/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid3 = _errs20 === errors;
}
else {
var valid3 = true;
}
}
}
}
}
}
else {
validate57.errors = [{instancePath:instancePath+"/failures/" + i0,schemaPath:"#/$defs/sourceFailure/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid1 = _errs13 === errors;
if(!valid1){
break;
}
}
}
else {
validate57.errors = [{instancePath:instancePath+"/failures",schemaPath:"#/properties/failures/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.missingDays !== undefined){
let data10 = data.missingDays;
const _errs22 = errors;
if(errors === _errs22){
if(Array.isArray(data10)){
var valid4 = true;
const len1 = data10.length;
for(let i1=0; i1<len1; i1++){
let data11 = data10[i1];
const _errs24 = errors;
const _errs25 = errors;
if(errors === _errs25){
if(typeof data11 === "string"){
if(!pattern7.test(data11)){
validate57.errors = [{instancePath:instancePath+"/missingDays/" + i1,schemaPath:"common.json#/$defs/reportingDay/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$"},message:"must match pattern \""+"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$"+"\""}];
return false;
}
}
else {
validate57.errors = [{instancePath:instancePath+"/missingDays/" + i1,schemaPath:"common.json#/$defs/reportingDay/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid4 = _errs24 === errors;
if(!valid4){
break;
}
}
}
else {
validate57.errors = [{instancePath:instancePath+"/missingDays",schemaPath:"#/properties/missingDays/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs22 === errors;
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
validate57.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate57.errors = vErrors;
return errors === 0;
}
validate57.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema79 = {"type":"object","additionalProperties":false,"required":["id","counts"],"properties":{"id":{"type":"string","minLength":1},"counts":{"$ref":"common.json#/$defs/outcomeCounts"},"callsAffected":{"type":"integer","minimum":0},"failedSeconds":{"type":["number","null"],"minimum":0}}};

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
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.id === undefined) && (missing0 = "id")) || ((data.counts === undefined) && (missing0 = "counts"))){
validate59.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "id") || (key0 === "counts")) || (key0 === "callsAffected")) || (key0 === "failedSeconds"))){
validate59.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.id !== undefined){
let data0 = data.id;
const _errs2 = errors;
if(errors === _errs2){
if(typeof data0 === "string"){
if(func1(data0) < 1){
validate59.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate59.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.counts !== undefined){
let data1 = data.counts;
const _errs4 = errors;
const _errs5 = errors;
if(errors === _errs5){
if(data1 && typeof data1 == "object" && !Array.isArray(data1)){
let missing1;
if((((((data1.passed === undefined) && (missing1 = "passed")) || ((data1.failed === undefined) && (missing1 = "failed"))) || ((data1.notAssessable === undefined) && (missing1 = "notAssessable"))) || ((data1.notApplicable === undefined) && (missing1 = "notApplicable"))) || ((data1.evaluated === undefined) && (missing1 = "evaluated"))){
validate59.errors = [{instancePath:instancePath+"/counts",schemaPath:"common.json#/$defs/outcomeCounts/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs7 = errors;
for(const key1 in data1){
if(!(((((key1 === "passed") || (key1 === "failed")) || (key1 === "notAssessable")) || (key1 === "notApplicable")) || (key1 === "evaluated"))){
validate59.errors = [{instancePath:instancePath+"/counts",schemaPath:"common.json#/$defs/outcomeCounts/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs7 === errors){
if(data1.passed !== undefined){
let data2 = data1.passed;
const _errs8 = errors;
if(!((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2)))){
validate59.errors = [{instancePath:instancePath+"/counts/passed",schemaPath:"common.json#/$defs/outcomeCounts/properties/passed/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs8){
if(typeof data2 == "number"){
if(data2 < 0 || isNaN(data2)){
validate59.errors = [{instancePath:instancePath+"/counts/passed",schemaPath:"common.json#/$defs/outcomeCounts/properties/passed/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid2 = _errs8 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data1.failed !== undefined){
let data3 = data1.failed;
const _errs10 = errors;
if(!((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3)))){
validate59.errors = [{instancePath:instancePath+"/counts/failed",schemaPath:"common.json#/$defs/outcomeCounts/properties/failed/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs10){
if(typeof data3 == "number"){
if(data3 < 0 || isNaN(data3)){
validate59.errors = [{instancePath:instancePath+"/counts/failed",schemaPath:"common.json#/$defs/outcomeCounts/properties/failed/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid2 = _errs10 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data1.notAssessable !== undefined){
let data4 = data1.notAssessable;
const _errs12 = errors;
if(!((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4)))){
validate59.errors = [{instancePath:instancePath+"/counts/notAssessable",schemaPath:"common.json#/$defs/outcomeCounts/properties/notAssessable/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs12){
if(typeof data4 == "number"){
if(data4 < 0 || isNaN(data4)){
validate59.errors = [{instancePath:instancePath+"/counts/notAssessable",schemaPath:"common.json#/$defs/outcomeCounts/properties/notAssessable/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid2 = _errs12 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data1.notApplicable !== undefined){
let data5 = data1.notApplicable;
const _errs14 = errors;
if(!((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5)))){
validate59.errors = [{instancePath:instancePath+"/counts/notApplicable",schemaPath:"common.json#/$defs/outcomeCounts/properties/notApplicable/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs14){
if(typeof data5 == "number"){
if(data5 < 0 || isNaN(data5)){
validate59.errors = [{instancePath:instancePath+"/counts/notApplicable",schemaPath:"common.json#/$defs/outcomeCounts/properties/notApplicable/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid2 = _errs14 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data1.evaluated !== undefined){
let data6 = data1.evaluated;
const _errs16 = errors;
if(!((typeof data6 == "number") && (!(data6 % 1) && !isNaN(data6)))){
validate59.errors = [{instancePath:instancePath+"/counts/evaluated",schemaPath:"common.json#/$defs/outcomeCounts/properties/evaluated/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs16){
if(typeof data6 == "number"){
if(data6 < 0 || isNaN(data6)){
validate59.errors = [{instancePath:instancePath+"/counts/evaluated",schemaPath:"common.json#/$defs/outcomeCounts/properties/evaluated/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid2 = _errs16 === errors;
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
}
else {
validate59.errors = [{instancePath:instancePath+"/counts",schemaPath:"common.json#/$defs/outcomeCounts/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.callsAffected !== undefined){
let data7 = data.callsAffected;
const _errs18 = errors;
if(!((typeof data7 == "number") && (!(data7 % 1) && !isNaN(data7)))){
validate59.errors = [{instancePath:instancePath+"/callsAffected",schemaPath:"#/properties/callsAffected/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs18){
if(typeof data7 == "number"){
if(data7 < 0 || isNaN(data7)){
validate59.errors = [{instancePath:instancePath+"/callsAffected",schemaPath:"#/properties/callsAffected/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid0 = _errs18 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.failedSeconds !== undefined){
let data8 = data.failedSeconds;
const _errs20 = errors;
if((!(typeof data8 == "number")) && (data8 !== null)){
validate59.errors = [{instancePath:instancePath+"/failedSeconds",schemaPath:"#/properties/failedSeconds/type",keyword:"type",params:{type: schema79.properties.failedSeconds.type},message:"must be number,null"}];
return false;
}
if(errors === _errs20){
if(typeof data8 == "number"){
if(data8 < 0 || isNaN(data8)){
validate59.errors = [{instancePath:instancePath+"/failedSeconds",schemaPath:"#/properties/failedSeconds/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid0 = _errs20 === errors;
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
validate59.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate59.errors = vErrors;
return errors === 0;
}
validate59.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema82 = {"type":"object","additionalProperties":false,"required":["bucket","buckets"],"properties":{"bucket":{"enum":["hour","day"]},"buckets":{"type":"array","items":{"$ref":"#/$defs/trendBucket"}}}};
const schema83 = {"type":"object","additionalProperties":false,"required":["at","clientSessions","clientSessionsFailed"],"properties":{"at":{"$ref":"common.json#/$defs/instant"},"clientSessions":{"type":"integer","minimum":0},"clientSessionsFailed":{"type":"integer","minimum":0},"clientSessionsAssessed":{"type":"integer","minimum":0}}};

function validate62(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate62.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.at === undefined) && (missing0 = "at")) || ((data.clientSessions === undefined) && (missing0 = "clientSessions"))) || ((data.clientSessionsFailed === undefined) && (missing0 = "clientSessionsFailed"))){
validate62.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "at") || (key0 === "clientSessions")) || (key0 === "clientSessionsFailed")) || (key0 === "clientSessionsAssessed"))){
validate62.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.at !== undefined){
let data0 = data.at;
const _errs2 = errors;
const _errs3 = errors;
if(errors === _errs3){
if(errors === _errs3){
if(typeof data0 === "string"){
if(!pattern4.test(data0)){
validate62.errors = [{instancePath:instancePath+"/at",schemaPath:"common.json#/$defs/instant/pattern",keyword:"pattern",params:{pattern: "Z$"},message:"must match pattern \""+"Z$"+"\""}];
return false;
}
}
else {
validate62.errors = [{instancePath:instancePath+"/at",schemaPath:"common.json#/$defs/instant/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.clientSessions !== undefined){
let data1 = data.clientSessions;
const _errs5 = errors;
if(!((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1)))){
validate62.errors = [{instancePath:instancePath+"/clientSessions",schemaPath:"#/properties/clientSessions/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs5){
if(typeof data1 == "number"){
if(data1 < 0 || isNaN(data1)){
validate62.errors = [{instancePath:instancePath+"/clientSessions",schemaPath:"#/properties/clientSessions/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.clientSessionsFailed !== undefined){
let data2 = data.clientSessionsFailed;
const _errs7 = errors;
if(!((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2)))){
validate62.errors = [{instancePath:instancePath+"/clientSessionsFailed",schemaPath:"#/properties/clientSessionsFailed/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs7){
if(typeof data2 == "number"){
if(data2 < 0 || isNaN(data2)){
validate62.errors = [{instancePath:instancePath+"/clientSessionsFailed",schemaPath:"#/properties/clientSessionsFailed/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.clientSessionsAssessed !== undefined){
let data3 = data.clientSessionsAssessed;
const _errs9 = errors;
if(!((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3)))){
validate62.errors = [{instancePath:instancePath+"/clientSessionsAssessed",schemaPath:"#/properties/clientSessionsAssessed/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs9){
if(typeof data3 == "number"){
if(data3 < 0 || isNaN(data3)){
validate62.errors = [{instancePath:instancePath+"/clientSessionsAssessed",schemaPath:"#/properties/clientSessionsAssessed/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid0 = _errs9 === errors;
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
validate62.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate62.errors = vErrors;
return errors === 0;
}
validate62.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate61(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate61.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.bucket === undefined) && (missing0 = "bucket")) || ((data.buckets === undefined) && (missing0 = "buckets"))){
validate61.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((key0 === "bucket") || (key0 === "buckets"))){
validate61.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.bucket !== undefined){
let data0 = data.bucket;
const _errs2 = errors;
if(!((data0 === "hour") || (data0 === "day"))){
validate61.errors = [{instancePath:instancePath+"/bucket",schemaPath:"#/properties/bucket/enum",keyword:"enum",params:{allowedValues: schema82.properties.bucket.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.buckets !== undefined){
let data1 = data.buckets;
const _errs3 = errors;
if(errors === _errs3){
if(Array.isArray(data1)){
var valid1 = true;
const len0 = data1.length;
for(let i0=0; i0<len0; i0++){
const _errs5 = errors;
if(!(validate62(data1[i0], {instancePath:instancePath+"/buckets/" + i0,parentData:data1,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate62.errors : vErrors.concat(validate62.errors);
errors = vErrors.length;
}
var valid1 = _errs5 === errors;
if(!valid1){
break;
}
}
}
else {
validate61.errors = [{instancePath:instancePath+"/buckets",schemaPath:"#/properties/buckets/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
else {
validate61.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate61.errors = vErrors;
return errors === 0;
}
validate61.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema85 = {"type":"object","additionalProperties":false,"required":["id"],"properties":{"id":{"type":"string","minLength":1},"calls":{"type":"array","items":{"$ref":"common.json#/$defs/callRef"}},"clientSessions":{"type":"array","items":{"$ref":"common.json#/$defs/clientSessionRef"}},"truncated":{"type":"boolean"}}};
const schema88 = {"type":"object","additionalProperties":false,"required":["roomId","callId","clientId"],"properties":{"roomId":{"type":"string","minLength":1},"callId":{"type":"string","minLength":1},"clientId":{"type":"string","minLength":1},"displayName":{"type":"string"}}};
const schema86 = {"type":"object","additionalProperties":false,"required":["roomId","callId"],"properties":{"roomId":{"type":"string","minLength":1},"callId":{"type":"string","minLength":1},"startedAt":{"$ref":"#/$defs/instant"},"clientsFailed":{"type":"integer","minimum":0}}};

function validate66(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate66.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.roomId === undefined) && (missing0 = "roomId")) || ((data.callId === undefined) && (missing0 = "callId"))){
validate66.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "roomId") || (key0 === "callId")) || (key0 === "startedAt")) || (key0 === "clientsFailed"))){
validate66.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.roomId !== undefined){
let data0 = data.roomId;
const _errs2 = errors;
if(errors === _errs2){
if(typeof data0 === "string"){
if(func1(data0) < 1){
validate66.errors = [{instancePath:instancePath+"/roomId",schemaPath:"#/properties/roomId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate66.errors = [{instancePath:instancePath+"/roomId",schemaPath:"#/properties/roomId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.callId !== undefined){
let data1 = data.callId;
const _errs4 = errors;
if(errors === _errs4){
if(typeof data1 === "string"){
if(func1(data1) < 1){
validate66.errors = [{instancePath:instancePath+"/callId",schemaPath:"#/properties/callId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate66.errors = [{instancePath:instancePath+"/callId",schemaPath:"#/properties/callId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.startedAt !== undefined){
let data2 = data.startedAt;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(errors === _errs7){
if(typeof data2 === "string"){
if(!pattern4.test(data2)){
validate66.errors = [{instancePath:instancePath+"/startedAt",schemaPath:"#/$defs/instant/pattern",keyword:"pattern",params:{pattern: "Z$"},message:"must match pattern \""+"Z$"+"\""}];
return false;
}
}
else {
validate66.errors = [{instancePath:instancePath+"/startedAt",schemaPath:"#/$defs/instant/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.clientsFailed !== undefined){
let data3 = data.clientsFailed;
const _errs9 = errors;
if(!((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3)))){
validate66.errors = [{instancePath:instancePath+"/clientsFailed",schemaPath:"#/properties/clientsFailed/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs9){
if(typeof data3 == "number"){
if(data3 < 0 || isNaN(data3)){
validate66.errors = [{instancePath:instancePath+"/clientsFailed",schemaPath:"#/properties/clientsFailed/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid0 = _errs9 === errors;
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
validate66.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate66.errors = vErrors;
return errors === 0;
}
validate66.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate65(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate65.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.id === undefined) && (missing0 = "id")){
validate65.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "id") || (key0 === "calls")) || (key0 === "clientSessions")) || (key0 === "truncated"))){
validate65.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.id !== undefined){
let data0 = data.id;
const _errs2 = errors;
if(errors === _errs2){
if(typeof data0 === "string"){
if(func1(data0) < 1){
validate65.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate65.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.calls !== undefined){
let data1 = data.calls;
const _errs4 = errors;
if(errors === _errs4){
if(Array.isArray(data1)){
var valid1 = true;
const len0 = data1.length;
for(let i0=0; i0<len0; i0++){
const _errs6 = errors;
if(!(validate66(data1[i0], {instancePath:instancePath+"/calls/" + i0,parentData:data1,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate66.errors : vErrors.concat(validate66.errors);
errors = vErrors.length;
}
var valid1 = _errs6 === errors;
if(!valid1){
break;
}
}
}
else {
validate65.errors = [{instancePath:instancePath+"/calls",schemaPath:"#/properties/calls/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.clientSessions !== undefined){
let data3 = data.clientSessions;
const _errs7 = errors;
if(errors === _errs7){
if(Array.isArray(data3)){
var valid2 = true;
const len1 = data3.length;
for(let i1=0; i1<len1; i1++){
let data4 = data3[i1];
const _errs9 = errors;
const _errs10 = errors;
if(errors === _errs10){
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
let missing1;
if((((data4.roomId === undefined) && (missing1 = "roomId")) || ((data4.callId === undefined) && (missing1 = "callId"))) || ((data4.clientId === undefined) && (missing1 = "clientId"))){
validate65.errors = [{instancePath:instancePath+"/clientSessions/" + i1,schemaPath:"common.json#/$defs/clientSessionRef/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs12 = errors;
for(const key1 in data4){
if(!((((key1 === "roomId") || (key1 === "callId")) || (key1 === "clientId")) || (key1 === "displayName"))){
validate65.errors = [{instancePath:instancePath+"/clientSessions/" + i1,schemaPath:"common.json#/$defs/clientSessionRef/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs12 === errors){
if(data4.roomId !== undefined){
let data5 = data4.roomId;
const _errs13 = errors;
if(errors === _errs13){
if(typeof data5 === "string"){
if(func1(data5) < 1){
validate65.errors = [{instancePath:instancePath+"/clientSessions/" + i1+"/roomId",schemaPath:"common.json#/$defs/clientSessionRef/properties/roomId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate65.errors = [{instancePath:instancePath+"/clientSessions/" + i1+"/roomId",schemaPath:"common.json#/$defs/clientSessionRef/properties/roomId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid4 = _errs13 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data4.callId !== undefined){
let data6 = data4.callId;
const _errs15 = errors;
if(errors === _errs15){
if(typeof data6 === "string"){
if(func1(data6) < 1){
validate65.errors = [{instancePath:instancePath+"/clientSessions/" + i1+"/callId",schemaPath:"common.json#/$defs/clientSessionRef/properties/callId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate65.errors = [{instancePath:instancePath+"/clientSessions/" + i1+"/callId",schemaPath:"common.json#/$defs/clientSessionRef/properties/callId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid4 = _errs15 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data4.clientId !== undefined){
let data7 = data4.clientId;
const _errs17 = errors;
if(errors === _errs17){
if(typeof data7 === "string"){
if(func1(data7) < 1){
validate65.errors = [{instancePath:instancePath+"/clientSessions/" + i1+"/clientId",schemaPath:"common.json#/$defs/clientSessionRef/properties/clientId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate65.errors = [{instancePath:instancePath+"/clientSessions/" + i1+"/clientId",schemaPath:"common.json#/$defs/clientSessionRef/properties/clientId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid4 = _errs17 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data4.displayName !== undefined){
const _errs19 = errors;
if(typeof data4.displayName !== "string"){
validate65.errors = [{instancePath:instancePath+"/clientSessions/" + i1+"/displayName",schemaPath:"common.json#/$defs/clientSessionRef/properties/displayName/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid4 = _errs19 === errors;
}
else {
var valid4 = true;
}
}
}
}
}
}
}
else {
validate65.errors = [{instancePath:instancePath+"/clientSessions/" + i1,schemaPath:"common.json#/$defs/clientSessionRef/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid2 = _errs9 === errors;
if(!valid2){
break;
}
}
}
else {
validate65.errors = [{instancePath:instancePath+"/clientSessions",schemaPath:"#/properties/clientSessions/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.truncated !== undefined){
const _errs21 = errors;
if(typeof data.truncated !== "boolean"){
validate65.errors = [{instancePath:instancePath+"/truncated",schemaPath:"#/properties/truncated/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs21 === errors;
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
validate65.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate65.errors = vErrors;
return errors === 0;
}
validate65.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const pattern19 = new RegExp("^[0-9]{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01]))?$", "u");

function validate54(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="https://schemas.observertc.org/digest/v2/period-summary.json" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate54.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((data.provenance === undefined) && (missing0 = "provenance")) || ((data.period === undefined) && (missing0 = "period"))) || ((data.sources === undefined) && (missing0 = "sources"))) || ((data.totals === undefined) && (missing0 = "totals"))) || ((data.checks === undefined) && (missing0 = "checks"))){
validate54.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((((key0 === "provenance") || (key0 === "period")) || (key0 === "sources")) || (key0 === "totals")) || (key0 === "checks")) || (key0 === "classification")) || (key0 === "trend")) || (key0 === "affected"))){
validate54.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.provenance !== undefined){
const _errs2 = errors;
if(!(validate55(data.provenance, {instancePath:instancePath+"/provenance",parentData:data,parentDataProperty:"provenance",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate55.errors : vErrors.concat(validate55.errors);
errors = vErrors.length;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.period !== undefined){
let data1 = data.period;
const _errs3 = errors;
const _errs4 = errors;
if(errors === _errs4){
if(data1 && typeof data1 == "object" && !Array.isArray(data1)){
let missing1;
if((((data1.kind === undefined) && (missing1 = "kind")) || ((data1.id === undefined) && (missing1 = "id"))) || ((data1.timezone === undefined) && (missing1 = "timezone"))){
validate54.errors = [{instancePath:instancePath+"/period",schemaPath:"#/$defs/period/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs6 = errors;
for(const key1 in data1){
if(!((((key1 === "kind") || (key1 === "id")) || (key1 === "timezone")) || (key1 === "provisional"))){
validate54.errors = [{instancePath:instancePath+"/period",schemaPath:"#/$defs/period/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs6 === errors){
if(data1.kind !== undefined){
let data2 = data1.kind;
const _errs7 = errors;
if(!((data2 === "day") || (data2 === "month"))){
validate54.errors = [{instancePath:instancePath+"/period/kind",schemaPath:"#/$defs/period/properties/kind/enum",keyword:"enum",params:{allowedValues: schema74.properties.kind.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid2 = _errs7 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data1.id !== undefined){
let data3 = data1.id;
const _errs8 = errors;
if(errors === _errs8){
if(typeof data3 === "string"){
if(!pattern19.test(data3)){
validate54.errors = [{instancePath:instancePath+"/period/id",schemaPath:"#/$defs/period/properties/id/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01]))?$"},message:"must match pattern \""+"^[0-9]{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01]))?$"+"\""}];
return false;
}
}
else {
validate54.errors = [{instancePath:instancePath+"/period/id",schemaPath:"#/$defs/period/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid2 = _errs8 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data1.timezone !== undefined){
const _errs10 = errors;
if("UTC" !== data1.timezone){
validate54.errors = [{instancePath:instancePath+"/period/timezone",schemaPath:"#/$defs/period/properties/timezone/const",keyword:"const",params:{allowedValue: "UTC"},message:"must be equal to constant"}];
return false;
}
var valid2 = _errs10 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data1.provisional !== undefined){
const _errs11 = errors;
if(typeof data1.provisional !== "boolean"){
validate54.errors = [{instancePath:instancePath+"/period/provisional",schemaPath:"#/$defs/period/properties/provisional/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid2 = _errs11 === errors;
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
else {
validate54.errors = [{instancePath:instancePath+"/period",schemaPath:"#/$defs/period/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs3 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.sources !== undefined){
const _errs13 = errors;
if(!(validate57(data.sources, {instancePath:instancePath+"/sources",parentData:data,parentDataProperty:"sources",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate57.errors : vErrors.concat(validate57.errors);
errors = vErrors.length;
}
var valid0 = _errs13 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.totals !== undefined){
let data7 = data.totals;
const _errs14 = errors;
const _errs15 = errors;
if(errors === _errs15){
if(data7 && typeof data7 == "object" && !Array.isArray(data7)){
let missing2;
if((((data7.calls === undefined) && (missing2 = "calls")) || ((data7.clientSessions === undefined) && (missing2 = "clientSessions"))) || ((data7.clientSessionsAssessed === undefined) && (missing2 = "clientSessionsAssessed"))){
validate54.errors = [{instancePath:instancePath+"/totals",schemaPath:"#/$defs/totals/required",keyword:"required",params:{missingProperty: missing2},message:"must have required property '"+missing2+"'"}];
return false;
}
else {
const _errs17 = errors;
for(const key2 in data7){
if(!(((((((key2 === "calls") || (key2 === "clientSessions")) || (key2 === "clientSessionsAssessed")) || (key2 === "observedSeconds")) || (key2 === "assessedSeconds")) || (key2 === "unassessedSeconds")) || (key2 === "callSeconds"))){
validate54.errors = [{instancePath:instancePath+"/totals",schemaPath:"#/$defs/totals/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs17 === errors){
if(data7.calls !== undefined){
let data8 = data7.calls;
const _errs18 = errors;
if(!((typeof data8 == "number") && (!(data8 % 1) && !isNaN(data8)))){
validate54.errors = [{instancePath:instancePath+"/totals/calls",schemaPath:"#/$defs/totals/properties/calls/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs18){
if(typeof data8 == "number"){
if(data8 < 0 || isNaN(data8)){
validate54.errors = [{instancePath:instancePath+"/totals/calls",schemaPath:"#/$defs/totals/properties/calls/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid4 = _errs18 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data7.clientSessions !== undefined){
let data9 = data7.clientSessions;
const _errs20 = errors;
if(!((typeof data9 == "number") && (!(data9 % 1) && !isNaN(data9)))){
validate54.errors = [{instancePath:instancePath+"/totals/clientSessions",schemaPath:"#/$defs/totals/properties/clientSessions/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs20){
if(typeof data9 == "number"){
if(data9 < 0 || isNaN(data9)){
validate54.errors = [{instancePath:instancePath+"/totals/clientSessions",schemaPath:"#/$defs/totals/properties/clientSessions/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid4 = _errs20 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data7.clientSessionsAssessed !== undefined){
let data10 = data7.clientSessionsAssessed;
const _errs22 = errors;
if(!((typeof data10 == "number") && (!(data10 % 1) && !isNaN(data10)))){
validate54.errors = [{instancePath:instancePath+"/totals/clientSessionsAssessed",schemaPath:"#/$defs/totals/properties/clientSessionsAssessed/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs22){
if(typeof data10 == "number"){
if(data10 < 0 || isNaN(data10)){
validate54.errors = [{instancePath:instancePath+"/totals/clientSessionsAssessed",schemaPath:"#/$defs/totals/properties/clientSessionsAssessed/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid4 = _errs22 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data7.observedSeconds !== undefined){
let data11 = data7.observedSeconds;
const _errs24 = errors;
if(errors === _errs24){
if(typeof data11 == "number"){
if(data11 < 0 || isNaN(data11)){
validate54.errors = [{instancePath:instancePath+"/totals/observedSeconds",schemaPath:"#/$defs/totals/properties/observedSeconds/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
else {
validate54.errors = [{instancePath:instancePath+"/totals/observedSeconds",schemaPath:"#/$defs/totals/properties/observedSeconds/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid4 = _errs24 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data7.assessedSeconds !== undefined){
let data12 = data7.assessedSeconds;
const _errs26 = errors;
if(errors === _errs26){
if(typeof data12 == "number"){
if(data12 < 0 || isNaN(data12)){
validate54.errors = [{instancePath:instancePath+"/totals/assessedSeconds",schemaPath:"#/$defs/totals/properties/assessedSeconds/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
else {
validate54.errors = [{instancePath:instancePath+"/totals/assessedSeconds",schemaPath:"#/$defs/totals/properties/assessedSeconds/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid4 = _errs26 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data7.unassessedSeconds !== undefined){
let data13 = data7.unassessedSeconds;
const _errs28 = errors;
if(errors === _errs28){
if(typeof data13 == "number"){
if(data13 < 0 || isNaN(data13)){
validate54.errors = [{instancePath:instancePath+"/totals/unassessedSeconds",schemaPath:"#/$defs/totals/properties/unassessedSeconds/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
else {
validate54.errors = [{instancePath:instancePath+"/totals/unassessedSeconds",schemaPath:"#/$defs/totals/properties/unassessedSeconds/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid4 = _errs28 === errors;
}
else {
var valid4 = true;
}
if(valid4){
if(data7.callSeconds !== undefined){
let data14 = data7.callSeconds;
const _errs30 = errors;
if(errors === _errs30){
if(typeof data14 == "number"){
if(data14 < 0 || isNaN(data14)){
validate54.errors = [{instancePath:instancePath+"/totals/callSeconds",schemaPath:"#/$defs/totals/properties/callSeconds/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
else {
validate54.errors = [{instancePath:instancePath+"/totals/callSeconds",schemaPath:"#/$defs/totals/properties/callSeconds/type",keyword:"type",params:{type: "number"},message:"must be number"}];
return false;
}
}
var valid4 = _errs30 === errors;
}
else {
var valid4 = true;
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
validate54.errors = [{instancePath:instancePath+"/totals",schemaPath:"#/$defs/totals/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.checks !== undefined){
let data15 = data.checks;
const _errs32 = errors;
if(errors === _errs32){
if(Array.isArray(data15)){
var valid5 = true;
const len0 = data15.length;
for(let i0=0; i0<len0; i0++){
const _errs34 = errors;
if(!(validate59(data15[i0], {instancePath:instancePath+"/checks/" + i0,parentData:data15,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate59.errors : vErrors.concat(validate59.errors);
errors = vErrors.length;
}
var valid5 = _errs34 === errors;
if(!valid5){
break;
}
}
}
else {
validate54.errors = [{instancePath:instancePath+"/checks",schemaPath:"#/properties/checks/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs32 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.classification !== undefined){
let data17 = data.classification;
const _errs35 = errors;
const _errs36 = errors;
if(errors === _errs36){
if(data17 && typeof data17 == "object" && !Array.isArray(data17)){
let missing3;
if(((((data17.qoeSymptom === undefined) && (missing3 = "qoeSymptom")) || ((data17.qosOnly === undefined) && (missing3 = "qosOnly"))) || ((data17.noIssueWithinCoverage === undefined) && (missing3 = "noIssueWithinCoverage"))) || ((data17.insufficientEvidence === undefined) && (missing3 = "insufficientEvidence"))){
validate54.errors = [{instancePath:instancePath+"/classification",schemaPath:"#/$defs/classificationCounts/required",keyword:"required",params:{missingProperty: missing3},message:"must have required property '"+missing3+"'"}];
return false;
}
else {
const _errs38 = errors;
for(const key3 in data17){
if(!((((key3 === "qoeSymptom") || (key3 === "qosOnly")) || (key3 === "noIssueWithinCoverage")) || (key3 === "insufficientEvidence"))){
validate54.errors = [{instancePath:instancePath+"/classification",schemaPath:"#/$defs/classificationCounts/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs38 === errors){
if(data17.qoeSymptom !== undefined){
let data18 = data17.qoeSymptom;
const _errs39 = errors;
if(!((typeof data18 == "number") && (!(data18 % 1) && !isNaN(data18)))){
validate54.errors = [{instancePath:instancePath+"/classification/qoeSymptom",schemaPath:"#/$defs/classificationCounts/properties/qoeSymptom/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs39){
if(typeof data18 == "number"){
if(data18 < 0 || isNaN(data18)){
validate54.errors = [{instancePath:instancePath+"/classification/qoeSymptom",schemaPath:"#/$defs/classificationCounts/properties/qoeSymptom/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid7 = _errs39 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data17.qosOnly !== undefined){
let data19 = data17.qosOnly;
const _errs41 = errors;
if(!((typeof data19 == "number") && (!(data19 % 1) && !isNaN(data19)))){
validate54.errors = [{instancePath:instancePath+"/classification/qosOnly",schemaPath:"#/$defs/classificationCounts/properties/qosOnly/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs41){
if(typeof data19 == "number"){
if(data19 < 0 || isNaN(data19)){
validate54.errors = [{instancePath:instancePath+"/classification/qosOnly",schemaPath:"#/$defs/classificationCounts/properties/qosOnly/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid7 = _errs41 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data17.noIssueWithinCoverage !== undefined){
let data20 = data17.noIssueWithinCoverage;
const _errs43 = errors;
if(!((typeof data20 == "number") && (!(data20 % 1) && !isNaN(data20)))){
validate54.errors = [{instancePath:instancePath+"/classification/noIssueWithinCoverage",schemaPath:"#/$defs/classificationCounts/properties/noIssueWithinCoverage/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs43){
if(typeof data20 == "number"){
if(data20 < 0 || isNaN(data20)){
validate54.errors = [{instancePath:instancePath+"/classification/noIssueWithinCoverage",schemaPath:"#/$defs/classificationCounts/properties/noIssueWithinCoverage/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid7 = _errs43 === errors;
}
else {
var valid7 = true;
}
if(valid7){
if(data17.insufficientEvidence !== undefined){
let data21 = data17.insufficientEvidence;
const _errs45 = errors;
if(!((typeof data21 == "number") && (!(data21 % 1) && !isNaN(data21)))){
validate54.errors = [{instancePath:instancePath+"/classification/insufficientEvidence",schemaPath:"#/$defs/classificationCounts/properties/insufficientEvidence/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs45){
if(typeof data21 == "number"){
if(data21 < 0 || isNaN(data21)){
validate54.errors = [{instancePath:instancePath+"/classification/insufficientEvidence",schemaPath:"#/$defs/classificationCounts/properties/insufficientEvidence/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"}];
return false;
}
}
}
var valid7 = _errs45 === errors;
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
else {
validate54.errors = [{instancePath:instancePath+"/classification",schemaPath:"#/$defs/classificationCounts/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs35 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.trend !== undefined){
const _errs47 = errors;
if(!(validate61(data.trend, {instancePath:instancePath+"/trend",parentData:data,parentDataProperty:"trend",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate61.errors : vErrors.concat(validate61.errors);
errors = vErrors.length;
}
var valid0 = _errs47 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.affected !== undefined){
let data23 = data.affected;
const _errs48 = errors;
if(errors === _errs48){
if(Array.isArray(data23)){
var valid8 = true;
const len1 = data23.length;
for(let i1=0; i1<len1; i1++){
const _errs50 = errors;
if(!(validate65(data23[i1], {instancePath:instancePath+"/affected/" + i1,parentData:data23,parentDataProperty:i1,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate65.errors : vErrors.concat(validate65.errors);
errors = vErrors.length;
}
var valid8 = _errs50 === errors;
if(!valid8){
break;
}
}
}
else {
validate54.errors = [{instancePath:instancePath+"/affected",schemaPath:"#/properties/affected/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs48 === errors;
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
validate54.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate54.errors = vErrors;
return errors === 0;
}
validate54.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const validateClientDigest = validate69;

function validate69(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate69.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((data.clientId === undefined) && (missing0 = "clientId")) || ((data.coverage === undefined) && (missing0 = "coverage"))) || ((data.checks === undefined) && (missing0 = "checks"))){
validate69.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((key0 === "clientId") || (key0 === "displayName")) || (key0 === "coverage")) || (key0 === "classification")) || (key0 === "checks"))){
validate69.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.clientId !== undefined){
let data0 = data.clientId;
const _errs2 = errors;
if(errors === _errs2){
if(typeof data0 === "string"){
if(func1(data0) < 1){
validate69.errors = [{instancePath:instancePath+"/clientId",schemaPath:"#/properties/clientId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate69.errors = [{instancePath:instancePath+"/clientId",schemaPath:"#/properties/clientId/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.displayName !== undefined){
const _errs4 = errors;
if(typeof data.displayName !== "string"){
validate69.errors = [{instancePath:instancePath+"/displayName",schemaPath:"#/properties/displayName/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.coverage !== undefined){
const _errs6 = errors;
if(!(validate33(data.coverage, {instancePath:instancePath+"/coverage",parentData:data,parentDataProperty:"coverage",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate33.errors : vErrors.concat(validate33.errors);
errors = vErrors.length;
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.classification !== undefined){
let data3 = data.classification;
const _errs7 = errors;
if(!((((data3 === "qoe-symptom") || (data3 === "qos-only")) || (data3 === "no-issue-within-coverage")) || (data3 === "insufficient-evidence"))){
validate69.errors = [{instancePath:instancePath+"/classification",schemaPath:"#/$defs/classification/enum",keyword:"enum",params:{allowedValues: schema52.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.checks !== undefined){
let data4 = data.checks;
const _errs9 = errors;
if(errors === _errs9){
if(Array.isArray(data4)){
var valid2 = true;
const len0 = data4.length;
for(let i0=0; i0<len0; i0++){
const _errs11 = errors;
if(!(validate37(data4[i0], {instancePath:instancePath+"/checks/" + i0,parentData:data4,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate37.errors : vErrors.concat(validate37.errors);
errors = vErrors.length;
}
var valid2 = _errs11 === errors;
if(!valid2){
break;
}
}
}
else {
validate69.errors = [{instancePath:instancePath+"/checks",schemaPath:"#/properties/checks/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs9 === errors;
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
validate69.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate69.errors = vErrors;
return errors === 0;
}
validate69.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const validateClientCheck = validate72;

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
if(((data.id === undefined) && (missing0 = "id")) || ((data.outcome === undefined) && (missing0 = "outcome"))){
validate72.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(func7.call(schema53.properties, key0))){
validate72.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.id !== undefined){
let data0 = data.id;
const _errs2 = errors;
if(errors === _errs2){
if(typeof data0 === "string"){
if(func1(data0) < 1){
validate72.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
else {
validate72.errors = [{instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.outcome !== undefined){
let data1 = data.outcome;
const _errs4 = errors;
if(!((((data1 === "passed") || (data1 === "failed")) || (data1 === "not-assessable")) || (data1 === "not-applicable"))){
validate72.errors = [{instancePath:instancePath+"/outcome",schemaPath:"common.json#/$defs/outcome/enum",keyword:"enum",params:{allowedValues: schema54.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.subject !== undefined){
const _errs6 = errors;
if(!(validate38(data.subject, {instancePath:instancePath+"/subject",parentData:data,parentDataProperty:"subject",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate38.errors : vErrors.concat(validate38.errors);
errors = vErrors.length;
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.rule !== undefined){
let data3 = data.rule;
const _errs7 = errors;
if(errors === _errs7){
if(typeof data3 === "string"){
if(func1(data3) > 300){
validate72.errors = [{instancePath:instancePath+"/rule",schemaPath:"#/properties/rule/maxLength",keyword:"maxLength",params:{limit: 300},message:"must NOT have more than 300 characters"}];
return false;
}
}
else {
validate72.errors = [{instancePath:instancePath+"/rule",schemaPath:"#/properties/rule/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.why !== undefined){
let data4 = data.why;
const _errs9 = errors;
if(errors === _errs9){
if(typeof data4 === "string"){
if(func1(data4) > 300){
validate72.errors = [{instancePath:instancePath+"/why",schemaPath:"#/properties/why/maxLength",keyword:"maxLength",params:{limit: 300},message:"must NOT have more than 300 characters"}];
return false;
}
}
else {
validate72.errors = [{instancePath:instancePath+"/why",schemaPath:"#/properties/why/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.observed !== undefined){
let data5 = data.observed;
const _errs11 = errors;
if(errors === _errs11){
if(Array.isArray(data5)){
var valid2 = true;
const len0 = data5.length;
for(let i0=0; i0<len0; i0++){
const _errs13 = errors;
if(!(validate40(data5[i0], {instancePath:instancePath+"/observed/" + i0,parentData:data5,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate40.errors : vErrors.concat(validate40.errors);
errors = vErrors.length;
}
var valid2 = _errs13 === errors;
if(!valid2){
break;
}
}
}
else {
validate72.errors = [{instancePath:instancePath+"/observed",schemaPath:"#/properties/observed/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs11 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.interval !== undefined){
const _errs14 = errors;
if(!(validate42(data.interval, {instancePath:instancePath+"/interval",parentData:data,parentDataProperty:"interval",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate42.errors : vErrors.concat(validate42.errors);
errors = vErrors.length;
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.issues !== undefined){
let data8 = data.issues;
const _errs15 = errors;
if(errors === _errs15){
if(Array.isArray(data8)){
var valid3 = true;
const len1 = data8.length;
for(let i1=0; i1<len1; i1++){
const _errs17 = errors;
if(!(validate44(data8[i1], {instancePath:instancePath+"/issues/" + i1,parentData:data8,parentDataProperty:i1,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate44.errors : vErrors.concat(validate44.errors);
errors = vErrors.length;
}
var valid3 = _errs17 === errors;
if(!valid3){
break;
}
}
}
else {
validate72.errors = [{instancePath:instancePath+"/issues",schemaPath:"#/properties/issues/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs15 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.events !== undefined){
let data10 = data.events;
const _errs18 = errors;
if(errors === _errs18){
if(Array.isArray(data10)){
var valid4 = true;
const len2 = data10.length;
for(let i2=0; i2<len2; i2++){
const _errs20 = errors;
if(!(validate46(data10[i2], {instancePath:instancePath+"/events/" + i2,parentData:data10,parentDataProperty:i2,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate46.errors : vErrors.concat(validate46.errors);
errors = vErrors.length;
}
var valid4 = _errs20 === errors;
if(!valid4){
break;
}
}
}
else {
validate72.errors = [{instancePath:instancePath+"/events",schemaPath:"#/properties/events/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs18 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.evidence !== undefined){
let data12 = data.evidence;
const _errs21 = errors;
if(errors === _errs21){
if(Array.isArray(data12)){
var valid5 = true;
const len3 = data12.length;
for(let i3=0; i3<len3; i3++){
const _errs23 = errors;
if(!(validate48(data12[i3], {instancePath:instancePath+"/evidence/" + i3,parentData:data12,parentDataProperty:i3,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate48.errors : vErrors.concat(validate48.errors);
errors = vErrors.length;
}
var valid5 = _errs23 === errors;
if(!valid5){
break;
}
}
}
else {
validate72.errors = [{instancePath:instancePath+"/evidence",schemaPath:"#/properties/evidence/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs21 === errors;
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
validate72.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate72.errors = vErrors;
return errors === 0;
}
validate72.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};
