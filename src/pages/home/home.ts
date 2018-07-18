import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform, ActionSheetController, ToastController, normalizeURL, AlertController } from 'ionic-angular';
import { OpenALPR, OpenALPROptions, OpenALPRResult } from '@ionic-native/openalpr';
import { File } from '@ionic-native/file';
import { FilePath } from '@ionic-native/file-path';
import { Transfer, TransferObject } from '@ionic-native/transfer';
import { Camera } from '@ionic-native/camera';

declare var cordova: any;

@IonicPage({
  name: 'HomePage'
})
@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
})
export class HomePage {
  
  lastImage: string = null; // last image name
  imgURL: string; // upload image url
  imageData: string; // base64 Image Data
  carRecognition = {
    number: '',
    confidence: ''
  };
  result: any;

  constructor(
    public navCtrl: NavController, 
    public navParams: NavParams,
    public platform: Platform,
    public actionSheetCtrl: ActionSheetController,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    private openALPR: OpenALPR,
    private file: File,
    private filePath: FilePath,
    private transfer: Transfer,
    private camera: Camera
  ) {
  }

  scanOptions: OpenALPROptions = {
    country: this.openALPR.Country.AU,
    amount: 3
  }

  public getCarPlate(){
    if(this.lastImage != null){
      let imagePath = cordova.file.dataDirectory + this.lastImage;
      this.openALPR.scan(imagePath, this.scanOptions)
      .then((res: [OpenALPRResult]) => {
        console.log(JSON.stringify(res));
        this.result = res;
        if(this.result.length == 0 ){
          this.carRecognition = {
            number: 'Can not identify car plate number, please try again',
            confidence: ''
          };
        }else{  
          this.carRecognition = {
            number: this.result[0].number,
            confidence: this.result[0].confidence  + '%'
          };
        }
      })
      .catch((error: Error) => console.error(error));
    }else{
      this.alertBox("No image selected","Please select image.","OK");
    }
  }

  public uploadImage() {
    // Destination URL - Change to you upload URL
    var url = 'https://example.com/upload.php';
  
    // File for upload
    var targetPath = this.pathForImage(this.lastImage);
  
    // File name only
    var filename = this.lastImage;
  
    var options = {
      fileKey: "file",
      fileName: filename,
      chunkedMode: false,
      mimeType: "multipart/form-data",
      params : {'fileName': filename}
    };
  
    const fileTransfer: TransferObject = this.transfer.create();
    
    // Use the FileTransfer to upload the image
    fileTransfer.upload(targetPath, url, options).then(data => {
      this.alertBox('Success','Image has been uploaded.','OK');
    }, err => {
      this.alertBox('Error','Error while uploading file.','OK');
    });
  }

  public presentActionSheet() {
    let actionSheet = this.actionSheetCtrl.create({
      title: 'Select Image Source',
      buttons: [
        {
          text: 'Load from Library',
          handler: () => {
            this.takePicture(this.camera.PictureSourceType.PHOTOLIBRARY);
          }
        },
        {
          text: 'Use Camera',
          handler: () => {
            this.takePicture(this.camera.PictureSourceType.CAMERA);
          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });
    actionSheet.present();
  }

  public takePicture(sourceType) {
    // Create options for the Camera Dialog
    var options = {
      quality: 100,
      sourceType: sourceType,
      saveToPhotoAlbum: false,
      correctOrientation: true
    };
  
    // Get the data of an image
    this.camera.getPicture(options).then((imagePath) => {
      // Special handling for Android library
      if (this.platform.is('android') && sourceType === this.camera.PictureSourceType.PHOTOLIBRARY) {
        this.filePath.resolveNativePath(imagePath)
          .then(filePath => {
            let correctPath = filePath.substr(0, filePath.lastIndexOf('/') + 1);
            let currentName = imagePath.substring(imagePath.lastIndexOf('/') + 1, imagePath.lastIndexOf('?'));
            this.copyFileToLocalDir(correctPath, currentName, this.createFileName());
          });
      } else {
        var currentName = imagePath.substr(imagePath.lastIndexOf('/') + 1);
        var correctPath = imagePath.substr(0, imagePath.lastIndexOf('/') + 1);
        this.copyFileToLocalDir(correctPath, currentName, this.createFileName());
      }
    }, (err) => {
      this.presentToast('No image selected.');
    });
  }

  // Create a new name for the image
  public createFileName() {
    var d = new Date(),
    n = d.getTime();
    let randomString = this.randomString();
    let newFileName =  n + "_" + randomString + ".jpg";
    return newFileName;
  }
  
  public randomString(length=6) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
    for (var i = 0; i < length; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  
    return text;
  }

  // Copy the image to a local folder
  public copyFileToLocalDir(namePath, currentName, newFileName) {
    this.file.copyFile(namePath, currentName, cordova.file.dataDirectory, newFileName).then(success => {
      this.lastImage = newFileName;
      this.imgURL = this.pathForImage(this.lastImage);
    }, error => {
      this.presentToast('Error while storing file.');
    });
  }

  public removeImage(){
    this.file.removeFile(cordova.file.dataDirectory,this.lastImage).then(success => {
      // this.global.presentToast('Image has been removed.');
      this.lastImage = null;
      this.carRecognition = {
        number: '',
        confidence: ''
      };
    }, error => {
      // this.global.presentToast('Error while removing file.');
    });
  }
  
  // Always get the accurate path to your apps folder
  public pathForImage(img) {
    if (img === null) {
      return '';
    } else {
      return normalizeURL(cordova.file.dataDirectory + img);
    }
  }

  public presentToast(text) {
    let toast = this.toastCtrl.create({
      message: text,
      duration: 3000,
      position: 'top'
    });
    toast.present();
  }

  public alertBox(title,subtitle,buttonText) {
    let alert = this.alertCtrl.create({
      title: title,
      subTitle: subtitle,
      buttons: [
          {
            text: buttonText,
          }
      ]
    });
    alert.present();
  }

}
