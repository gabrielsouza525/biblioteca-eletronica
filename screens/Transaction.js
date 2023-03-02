import React, { Component } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ImageBackground,
  Image,
  Alert,
  ToastAndroid,
  KeyboardAvoidingView
} from "react-native";
import * as Permissions from "expo-permissions";
import { BarCodeScanner } from "expo-barcode-scanner";
import db from "../confg"
import firebase from "firebase";

const bgImage = require("../assets/background2.png");
const appIcon = require("../assets/appIcon.png");
const appName = require("../assets/appName.png");

export default class TransactionScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      bookId: "",
      studentId: "",
      bookName: "",
      studentName: "",
      domState: "normal",
      hasCameraPermissions: null,
      scanned: false
    };
  }

  getCameraPermissions = async domState => {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);

    this.setState({
      /*status === "granted" é verdadeiro se o usuário concedeu permissão
          status === "granted" é falso se o usuário não concedeu permissão
        */
      hasCameraPermissions: status === "granted",
      domState: domState,
      scanned: false
    });
  };

  handleBarCodeScanned = async ({ type, data }) => {
    const { domState } = this.state;

    if (domState === "bookId") {
      this.setState({
        bookId: data,
        domState: "normal",
        scanned: true
      });
    } else if (domState === "studentId") {
      this.setState({
        studentId: data,
        domState: "normal",
        scanned: true
      });
    }
  };

  chekBookAvailability= async (bookId) => {
    const bookRef= await db
      .collection("books")
      .where("book_id","==", bookId)
      .get()

      let transaction_type=""
      if (bookRef.docs.length==0) {
        transaction_type=false
      } else {
        bookRef.docs.map((doc) => {
          transaction_type=doc.data().is_book_avaliable? "issue": "return"
        })
      }

      return transaction_type
  }

  checkStudentEligibilityForBookIssue= async (studentId) => {
    const studentRef=await db
      .collection("students")
      .where("student_id","==", studentId)
      .get()

      console.log("socorro 1",studentRef.docs, studentId)

      let isStudentEligible=""
      if (studentRef.docs.length==0) {
        console.log("socorro 2")
        this.setState({
          bookId: "",
          studentId: ""
        })
        isStudentEligible=false
        //ToastAndroid.show("O ID do aluno não existe", ToastAndroid.SHORT)
          Alert.alert("O ID do aluno não existe")
      } else {
        console.log("socorro 3")
        studentRef.docs.map((doc) => {
          if (doc.data().number_of_books_issued<2) {
            console.log("socorro 4")
            isStudentEligible=true
          } else {
            isStudentEligible=false
            this.setState({
              bookId: "",
              studentId: ""
            })
            //ToastAndroid.show("O aluno já retirou 2 livros", ToastAndroid.SHORT)
            Alert.alert("O aluno já retirou 2 livros")
          }
        })
      }

      console.log("socorro 5", isStudentEligible)

      return isStudentEligible
  }

  checkStudentEligibilityForBookReturn= async (bookId,studentId) => {
    const transactionRef= await db
      .collection("transactions")
      .where("book_id", "==", bookId)
      .limit(1)
      .get()

      let isStudentEligible=""
      transactionRef.docs.map((doc) => {
        let lastBookTransaction=doc.data()
        if (lastBookTransaction.student_id===studentId) {
          isStudentEligible=true
        } else {
          isStudentEligible=false
          //ToastAndroid.show("O livro não foi retirado por esse aluno", ToastAndroid.SHORT)
          Alert.alert("O livro não foi retirado por esse aluno")
          this.setState({
            bookId: "",
            studentId: ""
          })
        }
      })

      return isStudentEligible
  }

  getBookDetails=(bookId) => {
    bookId=bookId.trim()

    db.collection("books")
      .where("book_id", "==", bookId)
      .get()
      .then((snapshot)=>{
        snapshot.docs.map((doc)=>{
          this.setState({
            bookName: doc.data().book_name
          })
        })
      })
  }

  getStudentsDetails=(studentId) => {
    studentId=studentId.trim()

    db.collection("students")
      .where("student_id", "==", studentId)
      .get()
      .then((snapshot)=>{
        snapshot.docs.map((doc)=>{
          this.setState({
            studentName: doc.data().student_name
          })
        })
      })
  }

  initiateBookIssue = async (bookId, studentId, bookName, studentName) => {
    //adicionar uma transação
    db.collection("transactions").add({
      student_id: studentId,
      student_name: studentName,
      book_id: bookId,
      book_name: bookName,
      date: firebase.firestore.Timestamp.now().toDate(),
      transaction_type: "issue"
    });
    //alterar status do livro
    db.collection("books")
      .doc(bookId)
      .update({
        is_book_avaliable: false
      });
    // alterar o número de livros retirados pelo aluno
    db.collection("students")
      .doc(studentId)
      .update({
        number_of_books_issued: firebase.firestore.FieldValue.increment(1)
      });

    // atualizando estado local
    this.setState({
      bookId: "",
      studentId: ""
    });
  };

  initiateBookReturn= async (bookId, studentId, bookName, studentName)=>{
    //adicionar uma transação
    db.collection("transactions").add({
      student_id: studentId,
      student_name: studentName,
      book_id: bookId,
      book_name: bookName,
      date: firebase.firestore.Timestamp.now().toDate(),
      transaction_type: "return"
    });
    //alterar status do livro
    db.collection("books")
      .doc(bookId)
      .update({
        is_book_avaliable: true
      });
    // alterar o número de livros retirados pelo aluno
    db.collection("students")
      .doc(studentId)
      .update({
        number_of_books_issued: firebase.firestore.FieldValue.increment(-1)
      });

    // atualizando estado local
    this.setState({
      bookId: "",
      studentId: ""
    });
  }

  handleTrasaction= async () => {
    const {bookId, studentId, bookName, studentName}=this.state
    console.log("passei aq 1")
    await this.getBookDetails(bookId)
    await this.getStudentsDetails(studentId)
    console.log("passei aq 2")
    let transaction_type= await this.chekBookAvailability(bookId)
    console.log("passei aq 3")
    if (!transaction_type) {
      this.setState({
        bookId: "",
        studentId: ""
      });
      console.log("passei aq 4")
      //ToastAndroid.show("O livro não existe na biblioteca", ToastAndroid.SHORT)
      Alert.alert("O livro não existe na biblioteca")
    } else if(transaction_type==="issue") {
      let isStudentEligible= await this.checkStudentEligibilityForBookIssue(studentId)
      console.log("passei aq 5", isStudentEligible)
      if (isStudentEligible) {
        this.initiateBookIssue(bookId, studentId, bookName, studentName)
        //ToastAndroid.show("Livro entregue ao aluno", ToastAndroid.SHORT)
        Alert.alert("Livro entregue ao aluno")
      } 
    } else{
      console.log("passei aq 6")
      let isStudentEligible= await this.checkStudentEligibilityForBookReturn(bookId, studentId)
      console.log("passei aq 7")
      if (isStudentEligible) {
        this.initiateBookReturn(bookId, studentId, bookName, studentName)
        //ToastAndroid.show("Livro entregue a biblioteca", ToastAndroid.SHORT)
        Alert.alert("Livro entregue a biblioteca")
      }
    }
  }

  render() {
    const { bookId, studentId, domState, scanned } = this.state;
    if (domState !== "normal") {
      return (
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
      );
    }
    return (
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <ImageBackground source={bgImage} style={styles.bgImage}>
          <View style={styles.upperContainer}>
            <Image source={appIcon} style={styles.appIcon} />
            <Image source={appName} style={styles.appName} />
          </View>
          <View style={styles.lowerContainer}>
            <View style={styles.textinputContainer}>
              <TextInput
                style={styles.textinput}
                placeholder={"ID do Livro"}
                placeholderTextColor={"#FFFFFF"}
                value={bookId}
                onChangeText={(text) => {this.setState({bookId: text})}}
              />
              <TouchableOpacity
                style={styles.scanbutton}
                onPress={() => this.getCameraPermissions("bookId")}
              >
                <Text style={styles.scanbuttonText}>Digitalizar</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.textinputContainer, { marginTop: 25 }]}>
              <TextInput
                style={styles.textinput}
                placeholder={"ID do Estudante"}
                placeholderTextColor={"#FFFFFF"}
                value={studentId}
                onChangeText={(text) => {this.setState({studentId: text})}}
              />
              <TouchableOpacity
                style={styles.scanbutton}
                onPress={() => this.getCameraPermissions("studentId")}
              >
                <Text style={styles.scanbuttonText}>Digitalizar</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
                style={[styles.button, { marginTop: 25 }]}
                onPress={this.handleTrasaction}
              >
                <Text style={styles.buttonText}>enviar</Text>
              </TouchableOpacity>
          </View>
        </ImageBackground>
      </KeyboardAvoidingView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },
  bgImage: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center"
  },
  upperContainer: {
    flex: 0.5,
    justifyContent: "center",
    alignItems: "center"
  },
  appIcon: {
    width: 200,
    height: 200,
    resizeMode: "contain",
    marginTop: 80
  },
  appName: {
    width: 180,
    resizeMode: "contain"
  },
  lowerContainer: {
    flex: 0.5,
    alignItems: "center"
  },
  textinputContainer: {
    borderWidth: 2,
    borderRadius: 10,
    flexDirection: "row",
    backgroundColor: "#9DFD24",
    borderColor: "#FFFFFF"
  },
  textinput: {
    width: "57%",
    height: 50,
    padding: 10,
    borderColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 3,
    fontSize: 18,
    backgroundColor: "#5653D4",
    fontFamily: "Rajdhani_600SemiBold",
    color: "#FFFFFF"
  },
  scanbutton: {
    width: 100,
    height: 50,
    backgroundColor: "#9DFD24",
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    justifyContent: "center",
    alignItems: "center"
  },
  scanbuttonText: {
    fontSize: 20,
    color: "#0A0101",
    fontFamily: "Rajdhani_600SemiBold"
  }
});