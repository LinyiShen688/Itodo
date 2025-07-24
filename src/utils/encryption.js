/**
 * 简单的加密/解密工具
 * 用于安全保存记住的密码
 */

// 简单的Base64编码（仅用于混淆，不是真正的加密）
const encode = (str) => {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    return str;
  }
};

const decode = (str) => {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch (e) {
    return '';
  }
};

// 简单的XOR加密
const xorEncrypt = (text, key = 'iTodo2024') => {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return encode(result);
};

const xorDecrypt = (encryptedText, key = 'iTodo2024') => {
  const decodedText = decode(encryptedText);
  let result = '';
  for (let i = 0; i < decodedText.length; i++) {
    result += String.fromCharCode(
      decodedText.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return result;
};

export const encryptPassword = (password) => {
  return xorEncrypt(password);
};

export const decryptPassword = (encryptedPassword) => {
  return xorDecrypt(encryptedPassword);
};

// 本地存储键名
export const STORAGE_KEYS = {
  REMEMBERED_EMAIL: 'iTodo_remembered_email',
  REMEMBERED_PASSWORD: 'iTodo_remembered_password',
  REMEMBER_ME_ENABLED: 'iTodo_remember_me_enabled',
};