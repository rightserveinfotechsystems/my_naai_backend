router.post('/salon/device-token', authSalon, async (req, res) => {
  const { deviceToken, deviceType } = req.body;
  const salonId = req.salon.salonId;

  await DeviceToken.findOrCreate({
    where: {
      ownerType: 'SALON',
      ownerId: salonId,
      deviceToken
    },
    defaults: { deviceType }
  });

  res.json({ status: 'SUCCESS' });
});
