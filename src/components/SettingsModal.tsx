import React from "react";
import "antd/dist/antd.css";
import { Switch, Modal, Input, Button } from "antd";

export interface SettingsModalProps {
    checked: boolean;
    visible: boolean;
    messages_number: number;
    onChange: (v: boolean) => void;
    onMessagesNumberChange: (e) => void;
    onOk: () => void;
    onCancel: () => void;
}

export class SettingsModal extends React.Component<SettingsModalProps> {
    render() {
        return (
            <Modal title="Settings" visible={this.props.visible} okText={"Save"} onCancel={this.props.onCancel} onOk={this.props.onOk}>
                <h3>Parse messages</h3>
                The app should try to parse the incoming messages as json payloads where possible.
                <br />
                <Switch
                    style={{ margin: 10, marginLeft: 0 }}
                    onChange={this.props.onChange}
                    checked={this.props.checked}
                />
                <h3>Messages to display</h3>
                <Input type="number" onChange={this.props.onMessagesNumberChange} value={this.props.messages_number} />
            </Modal>
        );
    }
}
