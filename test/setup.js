require('dotenv').config();
const { expect } = require('chai');
const supertest = require('supertest');
const { API_TOKEN } = require('../src/config');

global.expect = expect;
global.supertest = supertest;
