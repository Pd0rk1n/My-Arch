/***************************************************************************
* Copyright (c) 2013 Abdurrahman AVCI <abdurrahmanavci@gmail.com>
*
* Permission is hereby granted, free of charge, to any person
* obtaining a copy of this software and associated documentation
* files (the "Software"), to deal in the Software without restriction,
* including without limitation the rights to use, copy, modify, merge,
* publish, distribute, sublicense, and/or sell copies of the Software,
* and to permit persons to whom the Software is furnished to do so,
* subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included
* in all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
* OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
* THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR
* OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
* ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
* OR OTHER DEALINGS IN THE SOFTWARE.
*
***************************************************************************/

import QtQuick 2.8
import QtQuick.Controls 2.8
import QtQuick.Controls 1.4 as Q1
import QtQuick.Controls.Styles 1.4
import SddmComponents 2.0
import "."


Rectangle {
    id: container
    width: 640
    height: 480


    LayoutMirroring.enabled: Qt.locale().textDirection == Qt.RightToLeft
    LayoutMirroring.childrenInherit: true

    property int sessionIndex: session.index

    TextConstants { id: textConstants }
    FontLoader { id: loginfont; source: "CompactaBT.ttf" }
    FontLoader { id: titlefont; source: "CompactaBT.ttf" }
    FontLoader { id: loginfontbold; source: "HelveticaUltraComp.ttf" }
    FontLoader { id: titlefontbold; source: "HelveticaUltraComp.ttf" }
    Connections {
        target: sddm

        onLoginSucceeded: {
            errorMessage.color = "white"
            errorMessage.text = textConstants.loginSucceeded
        }

        onLoginFailed: {
            password.text = ""
            errorMessage.color = "#ff9999"
            errorMessage.text = textConstants.loginFailed
            errorMessage.bold = true
        }
    }

    Background {
        anchors.fill: parent
        source: config.background
        fillMode: Image.Stretch
        onStatusChanged: {
            if (status == Image.Error && source != config.defaultBackground) {
                source = config.defaultBackground
            }
        }
    }

    Rectangle {
        anchors.fill: parent
        color: "transparent"


        Rectangle {
            anchors.left: parent.left
            anchors.leftMargin: 120
            y:parent.height / 2 - 250
            id: promptbox
            color: "transparent"
//             source: "promptbox.svg"
            height: 260
            width: 440
            
            Text {
                id: errorMessage
                anchors.horizontalCenter: parent.horizontalCenter
                anchors.top: parent.top
                anchors.topMargin: 48
                text: textConstants.prompt
                font.pointSize: 10
                color: "white"
                font.family: loginfont.name
            }
            
            Grid {
            id: gridfield
            anchors.left: promptbox.left
            rowSpacing: 8
            verticalItemAlignment: Grid.AlignVCenter
            anchors.verticalCenter: parent.verticalCenter
                columns: 2
                
                Text {
                    id: lblLoginName
                    width: 120
                    height: 30
                    text: textConstants.userName
                    font.pointSize: 12
                    verticalAlignment: Text.AlignVCenter
                    color: "white"
                    font.family: loginfont.name
                }
                
                TextField {
                    id: name
                    font.family: loginfontbold.name
                    width: 320
                    height: 42
                    text: userModel.lastUser
                    font.pointSize: 14
                    color: "#040a0e"
                        background: Image {
                            source: "input.svg"
                        }

                    KeyNavigation.backtab: rebootButton; KeyNavigation.tab: password

                    Keys.onPressed: {
                        if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter) {
                              password.focus = true
                        }
                    }
                }
                
                Text {
                    id: lblLoginPassword
                    width: 120
                    height: 30
                    text: textConstants.password
                    verticalAlignment: Text.AlignVCenter
                    color: "white"
                    font.pointSize: 12
                    font.family: loginfont.name
                }

                    TextField {
                        id: password
                        width: 320
                        height: 42
                        font.pointSize: 10
                        echoMode: TextInput.Password
                        font.family: loginfontbold.name
                        color: "black"
                        
                        background: Image {
                            source: "input.svg"
                        }

                        KeyNavigation.backtab: name; KeyNavigation.tab: loginButton

                        Keys.onPressed: {
                            if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter) {
                                sddm.login(name.text, password.text, sessionIndex)
                                event.accepted = true
                            }
                        }
                    }
            }
            
            Row {
                anchors.bottom: parent.bottom
                anchors.right: parent.right

                Image {
                    width: 128
                    height: 40
                    source: "buttonup.svg"
                    
                    MouseArea {
                        anchors.fill: parent
                        hoverEnabled: true
                        onEntered: { parent.source = "buttonhover.svg" }
                        onExited: { parent.source = "buttonup.svg" }
                        onPressed: {
                            parent.source = "buttondown.svg"
                            sddm.login(name.text, password.text, sessionIndex)
                        }
                        onReleased: {parent.source = "buttonup.svg"}
                    }
                    Text {
                        text: textConstants.login
                        anchors.centerIn: parent
                        font.family: loginfont.name
                        font.pointSize: 10
                        color: "white"
                    }
                    KeyNavigation.backtab: password; KeyNavigation.tab: shutdownButton
                }
            }
        }

        Image {
            id: greetbox
            anchors.left: parent.left
            anchors.leftMargin: 620
            y:parent.height / 2 - 250
            width: 8
            height: 320
            source: "divider.svg"
        }

        Rectangle {
            id: titlescreen
            anchors.left: parent.left
	    y:120
            //anchors.verticalCenter: parent.verticalCenter
            anchors.leftMargin: 720
            color: "transparent"
            width: 740
            height: 300
            
            Text {
                id: greet
                anchors.left: parent.left
                color: "white"
                text: textConstants.welcomeText.arg(sddm.hostName)
                font.family: titlefontbold.name
                font.pointSize: 30
                font.bold: true
            }
            Clock2 {
                id: clock
                anchors.topMargin: 48
                anchors.top: parent.top
                anchors.left: parent.left
                color: "white"
                timeFont.family: titlefont.name
                dateFont.family: titlefont.name
            }
        }
            

      
    }
    
    Rectangle {
        anchors.bottom: parent.bottom
        anchors.bottomMargin: 24
        width: parent.width
        height: 72
        color: "transparent"
        
        Column {
            anchors.left: parent.left
            anchors.leftMargin: 36
            width: 196
            
            Text {
                height: 30
                id: lblSession
                width: parent.width
                text: textConstants.session
		font.family: loginfont.name
                font.pointSize: 10

                verticalAlignment: Text.AlignVCenter
                color: "white"
            } 
                
            ComboBox {
                id: session
                width: parent.width
                height: 24
		font.family: loginfontbold.name
                font.pixelSize: 12
                arrowIcon: "comboarrow.svg"
                model: sessionModel
                index: sessionModel.lastIndex

                KeyNavigation.backtab: password; KeyNavigation.tab: shutdownButton
            }
        }
        
        Column {
            anchors.centerIn: parent

        }
        
        Column {
            anchors.right: parent.right
            anchors.rightMargin: 72
            width: 72
            
            Text {
                id: rebootName2
                anchors.horizontalCenter: parent.horizontalCenter
                height: 30
                text: textConstants.shutdown
                font.family: loginfont.name
                font.pointSize: 10
                verticalAlignment: Text.AlignVCenter
                color: "white"
            }
            
            Q1.Button {
                id: shutdownButton
                anchors.horizontalCenter: parent.horizontalCenter
                height: 36
                width: 36
                style: ButtonStyle {
                    background: Image {
                        source: control.pressed ? "shutdownpressed.svg" : "shutdown.svg"
                    }
                }

                onClicked: sddm.powerOff()
                        KeyNavigation.backtab: loginButton; KeyNavigation.tab: rebootButton
            }
    }
                Column {
            anchors.right: parent.right
            width: 96
            Text {
                id: rebootName
                anchors.horizontalCenter: parent.horizontalCenter
                height: 30
                text: textConstants.reboot
                font.family: loginfont.name
                font.pointSize: 10
                verticalAlignment: Text.AlignVCenter
                color: "white"
            }
            Q1.Button {
                id: rebootButton
                anchors.horizontalCenter: parent.horizontalCenter
                height: 36
                width: 36
                style: ButtonStyle {
                    background: Image {
                        source: control.pressed ? "rebootpressed.svg" : "reboot.svg"
                    }
                }

                onClicked: sddm.reboot()
                KeyNavigation.backtab: shutdownButton; KeyNavigation.tab: name
                        }
        }
    }

    Component.onCompleted: {
        if (name.text == "")
            name.focus = true
        else
            password.focus = true
    }
}
