const Setting = require('../models/Setting');

// GET /v1/settings/:key
exports.getSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await Setting.findOne({ key });
    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }
    res.json({ key: setting.key, value: setting.value });
  } catch (err) {
    console.error('getSetting error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /v1/settings/:key
exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    const setting = await Setting.findOneAndUpdate(
      { key },
      { value },
      { new: true, upsert: true } // Create if doesn't exist
    );

    res.json({ message: 'Setting updated successfully', setting: { key: setting.key, value: setting.value } });
  } catch (err) {
    console.error('updateSetting error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
