// Carrega .env ANTES de qualquer módulo que leia process.env em module scope.
// Imports ESM são hoisted: sem este módulo, DatabaseSkill() etc. rodam antes do dotenv.config().
import dotenv from "dotenv";
dotenv.config({ override: true });