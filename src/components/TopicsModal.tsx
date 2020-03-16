import React from "react";
import { List, Tag, Modal, Button, Input } from "antd";
import "antd/dist/antd.css";
import { OnChangeInputText, Topics_t, AddTopicMethod, RemoveTopicMethod } from "../types/App";

export interface TopicsModalProps {
    modal_topics: boolean;
    draft_topic: string;
    topics: { [key: string]: Topics_t };
    addTopic: AddTopicMethod;
    removeTopic: RemoveTopicMethod;
    // todo: rename onOk and onCancel methods
    closeTopicsModal: () => void;
    onChange: OnChangeInputText;
}

export class TopicsModal extends React.Component<TopicsModalProps> {
    render() {
        const topics = Object.keys(this.props.topics);
        const submitFn = () => {
            this.props.addTopic(this.props.draft_topic);
            this.setState({ draft_topic: "" });
        };
        return (
            <Modal
                title="Topics"
                visible={this.props.modal_topics}
                onCancel={this.props.closeTopicsModal}
                onOk={this.props.closeTopicsModal}
            >
                <h3> Add Topics </h3>
                <Input
                    value={this.props.draft_topic}
                    onChange={this.props.onChange("draft_topic")}
                    onPressEnter={submitFn}
                    placeholder={"Type a topic and press enter"}
                ></Input>
                <List
                    style={{ width: "100%" }}
                    dataSource={topics}
                    renderItem={(topic: string) => {
                        return (
                            <List.Item
                                key={topic}
                                style={{
                                    display: "flex",
                                    wordBreak: "break-word",
                                    justifyContent: "space-between"
                                }}
                            >
                                {<Tag color={"purple"}>{topic}</Tag>}
                                <Button type={"danger"} onClick={() => this.props.removeTopic(topic)}>
                                    <i className="fa fa-plus" />
                                    &nbsp; Delete
                                </Button>
                            </List.Item>
                        );
                    }}
                ></List>
            </Modal>
        );
    }
}
