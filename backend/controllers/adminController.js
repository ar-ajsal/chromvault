const Admin = require('../models/Admin');
const Setting = require('../models/Setting');
const jwt = require('jsonwebtoken');

function sendError(res, err, fallback = 'Something went wrong.') {
  if (err && (err.name === 'ValidationError' || err.name === 'CastError')) {
    return res.status(400).send({ message: err.message });
  }
  if (err && err.code === 11000) {
    return res.status(409).send({ message: 'An admin with that email already exists.' });
  }
  console.error('[admin]', err);
  return res.status(500).send({ message: fallback });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).send({ message: 'Name must be at least 2 characters.' });
    }
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).send({ message: 'A valid email address is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).send({ message: 'Password must be at least 6 characters.' });
    }

    const adminExists = await Admin.findOne({ email });
    if (adminExists) return res.status(409).send({ message: 'Admin already exists!' });

    const admin = await Admin.create({ name, email, password, role });

    res.status(201).send({
      message: 'Admin Registered Successfully!',
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      token: jwt.sign({ id: admin._id, type: 'admin' }, process.env.JWT_SECRET, { expiresIn: '30d' })
    });
  } catch (err) {
    sendError(res, err, 'Failed to register admin.');
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).send({ message: 'Email and password are required.' });
    }

    const admin = await Admin.findOne({ email });

    if (admin && (await admin.matchPassword(password))) {
      res.status(200).send({
        token: jwt.sign({ id: admin._id, type: 'admin' }, process.env.JWT_SECRET, { expiresIn: '30d' }),
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        image: admin.image,
        access_list: admin.access_list
      });
    } else {
      res.status(401).send({ message: 'Invalid Email or Password!' });
    }
  } catch (err) {
    sendError(res, err, 'Failed to log in.');
  }
};

const getSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await Setting.findOne({ key });
    if (!setting) {
      return res.status(200).send({ key, value: null });
    }
    res.status(200).send({ key: setting.key, value: setting.value });
  } catch (err) {
    sendError(res, err, 'Failed to fetch setting.');
  }
};

const saveSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    if (value === undefined) {
      return res.status(400).send({ message: 'Setting value is required.' });
    }
    const setting = await Setting.findOneAndUpdate(
      { key },
      { key, value },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(200).send({
      message: 'Setting saved successfully',
      key: setting.key,
      value: setting.value
    });
  } catch (err) {
    sendError(res, err, 'Failed to save setting.');
  }
};

module.exports = {
  registerAdmin,
  loginAdmin,
  getSetting,
  saveSetting
};
