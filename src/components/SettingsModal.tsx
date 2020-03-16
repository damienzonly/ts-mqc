import React from "react";
import "antd/dist/antd.css";
import { Switch, Modal } from "antd";

export interface SettingsModalProps {
    checked: boolean;
    onChange: (v: boolean) => void;
    visible: boolean;
    onOk: () => void;
    onCancel: () => void;
}

export class SettingsModal extends React.Component<SettingsModalProps> {
    render() {
        return (
            <Modal title="Topics" visible={this.props.visible} onCancel={this.props.onCancel} onOk={this.props.onOk}>
                <h2>Settings</h2>
                <h3>Parse messages</h3>
                <Switch
                    style={{ margin: 10, marginLeft: 0 }}
                    onChange={this.props.onChange}
                    checked={this.props.checked}
                />
            </Modal>
        );
    }
}
