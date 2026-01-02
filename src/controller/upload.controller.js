exports.uploadImageController = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required",
      });
    }

    const imageUrl = `/public/uploads/${req.file.filename}`;

    res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      url: imageUrl,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }

};
