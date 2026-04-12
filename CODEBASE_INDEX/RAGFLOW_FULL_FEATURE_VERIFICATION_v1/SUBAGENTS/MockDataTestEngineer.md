---
title: MockDataTestEngineer Sub-Agent Report
version: v1
generated: 2026-04-10 18:30
last_modified_by: RAGFLOW_FULL_FEATURE_VERIFICATION_AND_END_TO_END_TESTING_v1
problem: RAGFlow is integrated but not all features (dataset creation, upload, chat, auto-zoom) are confirmed working as shown in Gemini screenshot
target: Every RAGFlow feature fully tested and working end-to-end with mock lecture data + seamless integration with STUDY BUDDY app
---

# MockDataTestEngineer Report

## Mock Data Design for "Machine Learning" Dataset

### Test Transcript 1: ML Lecture Session
```
[00:01:15] Prof. Smith: Today we'll cover supervised learning, specifically neural networks and backpropagation.
[00:02:30] Prof. Smith: A neural network consists of layers: input layer, hidden layers, and output layer.
[00:04:00] Student A: Can you explain how gradient descent works in backpropagation?
[00:04:45] Prof. Smith: Gradient descent minimizes the loss function by computing partial derivatives and updating weights.
[00:06:10] Prof. Smith: The learning rate controls step size. Too high causes divergence, too low causes slow convergence.
[00:08:00] Student B: What's the difference between batch and stochastic gradient descent?
[00:08:30] Prof. Smith: Batch uses the entire dataset per update. Stochastic uses one sample. Mini-batch is the practical middle ground.
```

### Test Transcript 2: Deep Learning Session
```
[00:00:30] Prof. Smith: Convolutional Neural Networks are the backbone of computer vision.
[00:02:00] Prof. Smith: A CNN uses convolution layers, pooling layers, and fully connected layers.
[00:03:45] Student A: How do transformers compare to CNNs for image tasks?
[00:04:20] Prof. Smith: Vision Transformers (ViT) split images into patches and use self-attention, often outperforming CNNs on large datasets.
```

### Expected Entities for KG Auto-Zoom
- `neural networks`
- `backpropagation`
- `gradient descent`
- `supervised learning`
- `convolutional neural networks`
- `vision transformers`
- `learning rate`

### Test Questions for Chat Q&A
1. "What is backpropagation?" → Expected: grounded answer citing Prof. Smith's explanation
2. "How does gradient descent work?" → Expected: answer with loss function, partial derivatives
3. "Compare CNNs and transformers" → Expected: answer citing both sources, entity tags for CNN + ViT

### Integration Test Flow
1. Create "Machine Learning" dataset via `createDataset('Machine Learning')`
2. Upload transcript 1 via `uploadDocument(datasetId, 'ml_lecture_1.txt', transcript1)`
3. Upload transcript 2 via `uploadDocument(datasetId, 'deep_learning_1.txt', transcript2)`
4. Trigger parsing via `parseDocuments(datasetId, [doc1.id, doc2.id])`
5. Create conversation via `createConversation('ML Study Session')`
6. Ask "What is backpropagation?" via `askQuestion(convId, 'What is backpropagation?')`
7. Verify answer contains source chunks from transcript 1
8. Verify `relatedEntities` contains `backpropagation`, `neural networks`
9. Verify auto-zoom triggers in KG with matching node

### Status: MOCK DATA PREPARED — READY FOR LIVE TESTING
