const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const adminExists = await Admin.findOne({ email });
    if (adminExists) return res.status(400).send({ message: "Admin already exists!" });

    const admin = await Admin.create({
      name,
      email,
      password,
      role
    });

    res.status(200).send({
      message: "Admin Registered Successfully!",
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      token: jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '30d' })
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (admin && (await admin.matchPassword(password))) {
      res.status(200).send({
        token: jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '30d' }),
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        image: admin.image
      });
    } else {
      res.status(401).send({ message: "Invalid Email or Password!" });
    }
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

module.exports = {
  registerAdmin,
  loginAdmin
};
