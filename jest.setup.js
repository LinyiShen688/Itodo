import '@testing-library/jest-dom'

// Mock IndexedDB
global.indexedDB = require('fake-indexeddb')
global.IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange')

// Mock window.location
delete window.location
window.location = {
  reload: jest.fn(),
}

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))