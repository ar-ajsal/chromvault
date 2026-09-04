const Customer = require('../models/Customer');
const jwt = require('jsonwebtoken');

const createCustomer = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const customerExists = await Customer.findOne({ email });
    if (customerExists) return res.status(400).send({ message: "Customer already exists!" });

    const customer = await Customer.create({
      name,
      email,
      password,
    });

    res.status(200).send({
      message: "Customer Registered Successfully!",
      _id: customer._id,
      name: customer.name,
      email: customer.email,
      token: jwt.sign({ id: customer._id }, process.env.JWT_SECRET, { expiresIn: '30d' })
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;
    const customer = await Customer.findOne({ email });

    if (customer && (await customer.matchPassword(password))) {
      res.status(200).send({
        token: jwt.sign({ id: customer._id }, process.env.JWT_SECRET, { expiresIn: '30d' }),
        _id: customer._id,
        name: customer.name,
        email: customer.email,
      });
    } else {
      res.status(401).send({ message: "Invalid Email or Password!" });
    }
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({}).sort({ createdAt: -1 });
    res.status(200).send({ customers, totalDoc: customers.length });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    res.status(200).send(customer);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

module.exports = {
  createCustomer,
  loginCustomer,
  getAllCustomers,
  getCustomerById
};
