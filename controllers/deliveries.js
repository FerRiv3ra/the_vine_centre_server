const { unlinkSync } = require('fs');
const { response } = require('express');
const createPDF = require('../helpers/createPDF');
const nodemailer = require('nodemailer');

const { initialDate, converToDate } = require('../helpers/get-dates');
const Visit = require('../models/Visit');
const User = require('../models/user');
const emailHTML = require('../helpers/html-email');
const createXLSX = require('../helpers/createXLSX');
const moment = require('moment');

const createDelivery = async (req, res = response) => {
  const { customerId, uid } = req.body;

  const date = moment();

  const startDate = initialDate();

  const data = {
    customerId,
    date,
    startDate,
  };

  const existDelivery = await Visit.find({ customerId, startDate });

  if (existDelivery[0]) {
    return res.status(401).json({
      msg: 'This customer ID is alredy used this week',
    });
  }

  const user = await User.findById(uid);

  let { visits } = user;
  visits = visits + 1;

  const last = moment().format('DD/MM/YYYY');

  let blocked = false;
  if (visits % 4 === 0) {
    blocked = true;
  }

  await User.findByIdAndUpdate(uid, { visits, last, blocked });

  const delivery = new Visit(data);

  await delivery.save();

  res.status(201).json(delivery);
};

const getAllDeliveries = async (req, res = response) => {
  const today = new Date();
  const { startDate = '01/09/2022', finalDate = today } = req.query;
  let final;

  const start = converToDate(startDate);
  if (typeof finalDate === 'string') {
    final = converToDate(finalDate, 'final');
  } else {
    final = finalDate;
  }

  if (start > today || start > final) {
    return res.status(400).json({
      msg: 'The dates are not valid',
    });
  }

  if (final > today) {
    final = today;
  }

  const deliveries = await Visit.find({
    $and: [
      { date: { $gte: new Date(start), $lte: new Date(final) } },
      { state: true },
    ],
  });

  if (!deliveries) {
    return res.status(204).json({
      msg: 'Nothing to show',
    });
  }

  const users = await User.find();

  const usersData = deliveries.map((del) => {
    for (const user of users) {
      if (user.customerId === del.customerId) {
        user.visits = 0;
        return user;
      }
    }
  });

  const usersArr = usersData
    .reduce((temp, user) => {
      temp[user.customerId] = user;
      temp[user.customerId].visits += 1;
      return temp;
    }, [])
    .filter((temp) => temp !== null);

  res.json({ deliveries, usersArr });
};

const sendEmail = async (req, res = response) => {
  const today = new Date();
  const { startDate = '01/01/2022', finalDate = today } = req.body;
  let final;

  const start = converToDate(startDate);
  if (typeof finalDate === 'string') {
    final = converToDate(finalDate, 'final');
  } else {
    final = finalDate;
  }

  if (start > today || start > final) {
    return res.status(400).json({
      msg: 'The dates are not valid',
    });
  }

  if (final > today) {
    final = today;
  }

  const data = await Visit.find({
    $and: [
      { date: { $gte: new Date(start), $lte: new Date(final) } },
      { state: true },
    ],
  });

  if (!data) {
    return res.status(204).json({
      msg: 'Nothing to show',
    });
  }

  const users = await User.find();

  const visits = data.length;

  const usersData = data.map((del) => {
    for (const user of users) {
      if (user.customerId === del.customerId) {
        user.visits = 0;
        return user;
      }
    }
  });

  const usersArr = usersData
    .reduce((temp, user) => {
      temp[user.customerId] = user;
      temp[user.customerId].visits += 1;
      return temp;
    }, [])
    .filter((temp) => temp !== null);

  const email = req.user.email;

  const totalHousehold = usersArr.reduce((tot, item) => {
    return tot + item.noHousehold;
  }, 0);

  const response = await createPDF(
    start,
    final,
    usersArr,
    visits,
    totalHousehold
  );

  const excel = await createXLSX(
    start,
    final,
    usersArr,
    visits,
    totalHousehold
  );

  if (response.msg === 'OK' && excel.msg === 'OK') {
    try {
      const transport = nodemailer.createTransport({
        host: process.env.HOST_EMAIL,
        port: process.env.PORT_EMAIL,
        auth: {
          user: process.env.USER_EMAIL,
          pass: process.env.PASS_EMAIL,
        },
      });

      await transport.sendMail({
        from: '"No-Reply The Vine Centre" <no-reply@thevinecentre.org.uk>',
        to: email,
        subject: `Report ${start.toISOString().slice(0, 10)} - ${final
          .toISOString()
          .slice(0, 10)}`, // Subject line
        html: emailHTML,
        attachments: [
          {
            filename: `report${final.toISOString().slice(0, 10)}.pdf`,
            path: `./uploads/report${final.toISOString().slice(0, 10)}.pdf`,
            contentType: 'application/pdf',
          },
          {
            filename: `report${final.toISOString().slice(0, 10)}.xlsx`,
            path: `./uploads/report${final.toISOString().slice(0, 10)}.xlsx`,
            contentType:
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        ],
      });

      unlinkSync(`./uploads/report${final.toISOString().slice(0, 10)}.pdf`);
      unlinkSync(`./uploads/report${final.toISOString().slice(0, 10)}.xlsx`);

      return res.json({ msg: `Email sent to ${email}` });
    } catch (error) {
      return res.status(400).json({ error: 'Invalid email' });
    }
  } else {
    return res.status(408).json(response);
  }
};

const getDelivery = async (req, res = response) => {
  const { id } = req.params;
  const startDate = initialDate();

  const delivery = await Visit.find({ customerId: id, startDate });

  if (delivery.length !== 0) {
    return res.status(401).json({
      error: 'This customer ID is alredy used this week',
    });
  }

  res.status(200).json({
    msg: 'OK',
  });
};

const putDelivery = async (req, res = response) => {
  const { id } = req.params;
  const { _id, ...body } = req.body;

  const delivery = await Visit.findByIdAndUpdate(id, body);

  res.json(delivery);
};

const deleteDelivery = async (req, res = response) => {
  const { id } = req.params;

  const delivery = await Visit.findByIdAndUpdate(id, { state: false });

  res.json(delivery);
};

module.exports = {
  createDelivery,
  getAllDeliveries,
  getDelivery,
  putDelivery,
  deleteDelivery,
  sendEmail,
};
