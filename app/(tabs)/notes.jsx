import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
  Pressable,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/colors';
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import ThemedButton from '../../components/ThemedButton';
import { auth } from '../../services/supabase/auth';
import { createNote, listNotes } from '../../services/supabase/data';
import { uploadFile, getFileUrl } from '../../src/storage/storageProvider';

// DEPARTMENTS DATA
const DEPARTMENTS = [
  'Computer Engineering',
  'Civil Engineering',
  'Mechanical Engineering',
  'Chemical Engineering',
  'Architecture',
  'Electrical Engineering',
  'Electronics & Communication',
  'Aerospace Engineering',
];

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const SUBJECTS = ['Subject 1', 'Subject 2', 'Subject 3', 'Subject 4', 'Subject 5', 'Subject 6'];

export default function Notes() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  // Navigation State
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' or 'labReports'

  // Upload Modal State
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [uploadType, setUploadType] = useState(null); // 'pdf' or 'link'
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadLink, setUploadLink] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Data State
  const [notesData, setNotesData] = useState([]);
  const [labReportsData, setLabReportsData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch data when subject/tab changes
  useEffect(() => {
    if (selectedSubject) {
      fetchData();
    }
  }, [selectedSubject, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await listNotes(selectedDepartment, selectedSemester, selectedSubject, activeTab);
      
      if (activeTab === 'notes') {
        setNotesData(data);
      } else {
        setLabReportsData(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === 'ioecampus') {
      setPasswordVerified(true);
      setPasswordInput('');
    } else {
      Alert.alert('Wrong Password', 'Access denied');
      setPasswordInput('');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        setSelectedFile(result);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const handleUpload = async () => {
    if (!uploadTitle.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (uploadType === 'link' && !uploadLink.trim()) {
      Alert.alert('Error', 'Please enter a link');
      return;
    }

    if (uploadType === 'pdf' && !selectedFile) {
      Alert.alert('Error', 'Please select a PDF file');
      return;
    }

    setUploading(true);

    try {
      const collectionPath = `notes/${selectedDepartment}/sem${selectedSemester}/${selectedSubject}/${activeTab}`;
      
      let uploadData = {
        title: uploadTitle,
        type: uploadType,
        uploadedBy: auth.currentUser?.email || 'anonymous',
        department: selectedDepartment,
        semester: selectedSemester,
        subject: selectedSubject,
        category: activeTab,
      };

      if (uploadType === 'link') {
        uploadData.url = uploadLink;
      } else {
        const filePath = await uploadFile({
          uri: selectedFile.uri,
          fileName: `${Date.now()}_${selectedFile.name}`,
          contentType: 'application/pdf',
        }, `notes/${selectedDepartment}/sem${selectedSemester}/${selectedSubject}/${activeTab}`);

        uploadData.filePath = filePath;
        uploadData.fileName = selectedFile.name;
      }

      await createNote(uploadData);
      
      Alert.alert('Success', 'Uploaded successfully!');
      resetUploadModal();
      fetchData(); // Refresh list
    } catch (error) {
      console.error('Error uploading:', error);
      Alert.alert('Error', 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const resetUploadModal = () => {
    setUploadModalVisible(false);
    setPasswordVerified(false);
    setUploadType(null);
    setUploadTitle('');
    setUploadLink('');
    setSelectedFile(null);
    setPasswordInput('');
  };

  const openLink = (url) => {
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Cannot open link'));
  };

  const renderDepartmentSelector = () => (
    <ThemedView style={styles.container}>
      <ThemedText title style={styles.header}>SELECT DEPARTMENT</ThemedText>
      <ScrollView contentContainerStyle={styles.gridContainer}>
        {DEPARTMENTS.map((dept, index) => (
          <ThemedButton
            key={index}
            style={[styles.card, { backgroundColor: theme.uiBackground }]}
            onPress={() => setSelectedDepartment(dept)}
          >
            <ThemedText style={styles.cardText}>{dept}</ThemedText>
          </ThemedButton>
        ))}
      </ScrollView>
    </ThemedView>
  );

  const renderSemesterSelector = () => (
    <ThemedView style={styles.container}>
      <ThemedButton onPress={() => setSelectedDepartment(null)} style={styles.backButton}>
        <Ionicons name="arrow-back" size={20} color={theme.iconColorFocused} />
        <ThemedText style={styles.backButtonText}>Back</ThemedText>
      </ThemedButton>
      <ThemedText title style={styles.header}>{selectedDepartment}</ThemedText>
      <ThemedText style={styles.subHeader}>SELECT SEMESTER</ThemedText>
      <ScrollView contentContainerStyle={styles.gridContainer}>
        {SEMESTERS.map((sem) => (
          <ThemedButton
            key={sem}
            style={[styles.card, { backgroundColor: theme.uiBackground }]}
            onPress={() => setSelectedSemester(sem)}
          >
            <ThemedText style={styles.cardText}>SEMESTER {sem}</ThemedText>
          </ThemedButton>
        ))}
      </ScrollView>
    </ThemedView>
  );

  const renderSubjectSelector = () => (
    <ThemedView style={styles.container}>
      <ThemedButton onPress={() => setSelectedSemester(null)} style={styles.backButton}>
        <Ionicons name="arrow-back" size={20} color={theme.iconColorFocused} />
        <ThemedText style={styles.backButtonText}>Back</ThemedText>
      </ThemedButton>
      <ThemedText title style={styles.header}>SEMESTER {selectedSemester}</ThemedText>
      <ThemedText style={styles.subHeader}>SELECT SUBJECT</ThemedText>
      <ScrollView contentContainerStyle={styles.gridContainer}>
        {SUBJECTS.map((subject, index) => (
          <ThemedButton
            key={index}
            style={[styles.card, { backgroundColor: theme.uiBackground }]}
            onPress={() => setSelectedSubject(subject)}
          >
            <ThemedText style={styles.cardText}>{subject}</ThemedText>
          </ThemedButton>
        ))}
      </ScrollView>
    </ThemedView>
  );

  const renderSubjectView = () => {
    const currentData = activeTab === 'notes' ? notesData : labReportsData;

    return (
      <ThemedView style={styles.container}>
        <ThemedButton onPress={() => setSelectedSubject(null)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={theme.iconColorFocused} />
          <ThemedText style={styles.backButtonText}>Back</ThemedText>
        </ThemedButton>
        <ThemedText title style={styles.header}>{selectedSubject}</ThemedText>

        {/* Tabs */}
        <View style={[styles.tabContainer, { borderBottomColor: theme.iconColor }]}>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'notes' && { borderBottomWidth: 3, borderBottomColor: theme.iconColorFocused }
            ]}
            onPress={() => setActiveTab('notes')}
          >
            <ThemedText style={[
              styles.tabText,
              { color: activeTab === 'notes' ? theme.iconColorFocused : theme.iconColor }
            ]}>
              NOTES
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'labReports' && { borderBottomWidth: 3, borderBottomColor: theme.iconColorFocused }
            ]}
            onPress={() => setActiveTab('labReports')}
          >
            <ThemedText style={[
              styles.tabText,
              { color: activeTab === 'labReports' ? theme.iconColorFocused : theme.iconColor }
            ]}>
              LAB REPORTS
            </ThemedText>
          </Pressable>
        </View>

        {/* Upload Button */}
        <ThemedButton
          style={[styles.uploadButton, { backgroundColor: '#007AFF' }]}
          onPress={() => setUploadModalVisible(true)}
        >
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <ThemedText style={styles.uploadButtonText}>UPLOAD</ThemedText>
        </ThemedButton>

        {/* Content List */}
        {loading ? (
          <ActivityIndicator size="large" color={theme.iconColorFocused} style={{ marginTop: 50 }} />
        ) : (
          <ScrollView style={styles.contentList}>
            {currentData.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-outline" size={64} color={theme.iconColor} style={{ opacity: 0.3 }} />
                <ThemedText style={styles.emptyText}>
                  No {activeTab === 'notes' ? 'notes' : 'lab reports'} yet
                </ThemedText>
                <ThemedText style={styles.emptySubtext}>Be the first to upload!</ThemedText>
              </View>
            ) : (
              currentData.map((item) => (
                <ThemedButton
                  key={item.id}
                  style={[styles.contentCard, { backgroundColor: theme.uiBackground }]}
                  onPress={() => item.type === 'link' ? openLink(item.url) : openLink(getFileUrl(item.filePath || item.fileUrl))}
                >
                  <View style={styles.contentHeader}>
                    <Ionicons 
                      name={item.type === 'pdf' ? 'document-text' : 'link'} 
                      size={24} 
                      color={theme.iconColorFocused} 
                    />
                    <View style={styles.contentTextContainer}>
                      <ThemedText style={styles.contentTitle}>{item.title}</ThemedText>
                      <ThemedText style={styles.contentMeta}>
                        {item.type === 'pdf' ? 'PDF' : 'Link'} • {item.uploadedBy}
                      </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.iconColor} />
                  </View>
                </ThemedButton>
              ))
            )}
          </ScrollView>
        )}
      </ThemedView>
    );
  };

  const renderUploadModal = () => (
    <Modal visible={uploadModalVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          {!passwordVerified ? (
            <>
              <ThemedText title style={styles.modalTitle}>ENTER PASSWORD</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.uiBackground, color: theme.text, borderColor: theme.iconColor }]}
                placeholder="Password"
                placeholderTextColor={theme.iconColor}
                secureTextEntry
                value={passwordInput}
                onChangeText={setPasswordInput}
              />
              <View style={styles.modalButtons}>
                <ThemedButton style={[styles.cancelButton, { backgroundColor: theme.uiBackground }]} onPress={resetUploadModal}>
                  <ThemedText style={styles.cancelButtonText}>CANCEL</ThemedText>
                </ThemedButton>
                <ThemedButton style={[styles.submitButton, { backgroundColor: '#007AFF' }]} onPress={handlePasswordSubmit}>
                  <ThemedText style={styles.submitButtonText}>SUBMIT</ThemedText>
                </ThemedButton>
              </View>
            </>
          ) : !uploadType ? (
            <>
              <ThemedText title style={styles.modalTitle}>SELECT UPLOAD TYPE</ThemedText>
              <ThemedButton
                style={[styles.typeButton, { backgroundColor: '#007AFF' }]}
                onPress={() => setUploadType('pdf')}
              >
                <Ionicons name="document" size={20} color="#fff" />
                <ThemedText style={styles.typeButtonText}>UPLOAD PDF</ThemedText>
              </ThemedButton>
              <ThemedButton
                style={[styles.typeButton, { backgroundColor: '#007AFF' }]}
                onPress={() => setUploadType('link')}
              >
                <Ionicons name="link" size={20} color="#fff" />
                <ThemedText style={styles.typeButtonText}>ADD LINK</ThemedText>
              </ThemedButton>
              <ThemedButton style={[styles.cancelButton, { backgroundColor: theme.uiBackground }]} onPress={resetUploadModal}>
                <ThemedText style={styles.cancelButtonText}>CANCEL</ThemedText>
              </ThemedButton>
            </>
          ) : (
            <>
              <ThemedText title style={styles.modalTitle}>
                {uploadType === 'pdf' ? 'UPLOAD PDF' : 'ADD LINK'}
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.uiBackground, color: theme.text, borderColor: theme.iconColor }]}
                placeholder="Title"
                placeholderTextColor={theme.iconColor}
                value={uploadTitle}
                onChangeText={setUploadTitle}
              />
              {uploadType === 'link' ? (
                <TextInput
                  style={[styles.input, { backgroundColor: theme.uiBackground, color: theme.text, borderColor: theme.iconColor }]}
                  placeholder="https://example.com"
                  placeholderTextColor={theme.iconColor}
                  value={uploadLink}
                  onChangeText={setUploadLink}
                  autoCapitalize="none"
                />
              ) : (
                <>
                  <ThemedButton style={[styles.filePickerButton, { borderColor: '#007AFF' }]} onPress={pickDocument}>
                    <Ionicons name="folder-open-outline" size={20} color="#007AFF" />
                    <ThemedText style={[styles.filePickerText, { color: '#007AFF' }]}>
                      {selectedFile ? selectedFile.name : 'SELECT PDF FILE'}
                    </ThemedText>
                  </ThemedButton>
                </>
              )}
              {uploading ? (
                <ActivityIndicator size="large" color={theme.iconColorFocused} style={{ marginTop: 20 }} />
              ) : (
                <View style={styles.modalButtons}>
                  <ThemedButton style={[styles.cancelButton, { backgroundColor: theme.uiBackground }]} onPress={resetUploadModal}>
                    <ThemedText style={styles.cancelButtonText}>CANCEL</ThemedText>
                  </ThemedButton>
                  <ThemedButton style={[styles.submitButton, { backgroundColor: '#007AFF' }]} onPress={handleUpload}>
                    <ThemedText style={styles.submitButtonText}>UPLOAD</ThemedText>
                  </ThemedButton>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  // Main render logic
  if (!selectedDepartment) return renderDepartmentSelector();
  if (!selectedSemester) return renderSemesterSelector();
  if (!selectedSubject) return renderSubjectSelector();
  return (
    <>
      {renderSubjectView()}
      {renderUploadModal()}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subHeader: {
    fontSize: 16,
    opacity: 0.6,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    padding: 20,
    marginBottom: 16,
    borderRadius: 12,
  },
  cardText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  uploadButton: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  contentList: {
    flex: 1,
  },
  contentCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contentTextContainer: {
    flex: 1,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  contentMeta: {
    fontSize: 12,
    opacity: 0.6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.5,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    padding: 24,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 1,
  },
  input: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  typeButton: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  typeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  filePickerButton: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  filePickerText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
