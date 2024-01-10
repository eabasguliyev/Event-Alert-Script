const nodemailer = require("nodemailer");
const nodeWebcam = require("node-webcam");
const screenshot = require("desktop-screenshot");
const fs = require("fs");
const path = require("path");

// SMTP config
const host = "smtp-host";
const port = 465;
const user = "smtp-mail";
const password = "smtp-pass";
const recipient = "recipient-email";

const captureImage = (imagePath, options) => {
  return new Promise((resolve, reject) => {
    nodeWebcam.capture(imagePath, options, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
        // fs.unlinkSync(imagePath);
      }
    });
  });
};

const takeScreenshot = (path, resolution) => {
  return new Promise((resolve, reject) => {
    screenshot(path, resolution, (error, complete) => {
      if (error) {
        reject(error);
      } else {
        resolve(complete);
      }
    });
  });
};

const run = async () => {
  try {
    const [, , eventName] = process.argv;

    let subject;

    const options = {
      width: 1280,
      height: 720,
      quality: 100,
      frames: 60,
      delay: 0,
      saveShots: true,
      output: "png",
      device: false,
      callbackReturn: "base64",
      verbose: false,
    };

    if (eventName === "starts") {
      subject = "Your computer started";
    } else if (eventName === "incorrect") {
      subject = "Someone attempted login with invalid credentials";
    } else if (eventName === "login") {
      subject = "Someone logged in";
    } else if (eventName === "lock") {
      subject = "Someone locked computer";
    } else if (eventName === "unlock") {
      subject = "Someone unlocked computer";
    }

    const cameraImagePath = path.join(
      path.dirname(__filename),
      "files",
      "images",
      "cam-" + eventName + "-" + new Date().getTime() + ".png"
    );
    const desktopScreenshotPath = path.join(
      path.dirname(__filename),
      "files",
      "images",
      "desk-" + eventName + "-" + new Date().getTime() + ".png"
    );

    const imageAsBase64 = await captureImage(cameraImagePath, options);

    let screenshotAsBase64;

    if (
      await takeScreenshot(desktopScreenshotPath, { width: 1024, height: 768 })
    ) {
      screenshotAsBase64 =
        "data:image/png;base64," +
        fs.readFileSync(desktopScreenshotPath, {
          encoding: "base64",
        });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      auth: {
        user: user,
        pass: password,
      },
    });

    await transporter.sendMail({
      from: user,
      to: recipient,
      subject,
      attachments: [
        {
          filename: "camera.png",
          path: imageAsBase64,
        },
        screenshotAsBase64
          ? {
              filename: "desktop.png",
              path: screenshotAsBase64,
            }
          : {},
      ],
    });
  } catch (error) {
    fs.writeFileSync(
      path.join(
        path.dirname(__filename),
        "files",
        "logs",
        "log-" + new Date().getTime() + ".txt"
      ),
      JSON.stringify({
        name: error.name,
        message: error.message,
        stack: error.stack,
      })
    );
  }
};

run();
