const { createApp } = Vue;

// Register components
const app = createApp({
    // Change delimiters before defining components
    delimiters: ['[[', ']]'],
    data() {
        return {
            topicId: document.getElementById('formBuilder').dataset.topicId,
            availableElements: [
                { type: 'text', label: 'Text Input', icon: 'fas fa-font' },
                { type: 'textarea', label: 'Text Area', icon: 'fas fa-paragraph' },
                { type: 'radio', label: 'Radio Group', icon: 'fas fa-dot-circle' },
                { type: 'checkbox', label: 'Checkbox Group', icon: 'fas fa-check-square' },
                { type: 'select', label: 'Dropdown', icon: 'fas fa-caret-square-down' }
            ],
            formElements: [],
            selectedElement: null,
            propertiesModal: null,
            editingElement: null,
            elementTypes: [
                { type: 'text', label: 'Text Input', icon: 'fas fa-font' },
                { type: 'textarea', label: 'Text Area', icon: 'fas fa-paragraph' },
                { type: 'radio', label: 'Radio Group', icon: 'fas fa-dot-circle' },
                { type: 'checkbox', label: 'Checkbox Group', icon: 'fas fa-check-square' },
                { type: 'select', label: 'Dropdown', icon: 'fas fa-caret-square-down' }
            ],
            nextId: 1,
            formName: '',
            formDescription: ''
        }
    },
    mounted() {
        // Initialize modal after component is mounted
        this.$nextTick(() => {
            this.propertiesModal = new bootstrap.Modal(document.getElementById('propertiesModal'));
        });
    },
    methods: {
        dragStart(event, element) {
            event.dataTransfer.setData('element', JSON.stringify(element));
        },
        
        dropElement(event) {
            const element = JSON.parse(event.dataTransfer.getData('element'));
            const newElement = {
                ...element,
                id: Date.now(),
                label: 'New Question',
                required: false,
                options: element.type === 'radio' || element.type === 'checkbox' || element.type === 'select' ? [] : undefined
            };
            this.formElements.push(newElement);
            this.$nextTick(() => {
                this.showPropertiesModal(newElement);
            });
        },
        
        editElement(index) {
            this.showPropertiesModal(this.formElements[index]);
        },
        
        updateElement(data) {
            const index = this.formElements.findIndex(el => el.id === data.id);
            if (index !== -1) {
                // Create a new object to ensure reactivity
                this.formElements[index] = {
                    ...this.formElements[index],
                    ...data
                };
            }
        },
        
        removeElement(index) {
            this.formElements.splice(index, 1);
            if (this.selectedElement === index) {
                this.selectedElement = null;
            }
        },
        
        moveElement(index, direction) {
            const newIndex = index + direction;
            if (newIndex >= 0 && newIndex < this.formElements.length) {
                const element = this.formElements[index];
                this.formElements.splice(index, 1);
                this.formElements.splice(newIndex, 0, element);
                this.selectedElement = newIndex;
            }
        },
        
        async saveForm() {
            try {
                const response = await fetch('/questionnaire/create-manual/' + this.topicId + '/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    },
                    body: JSON.stringify({
                        name: 'Manual Questionnaire',
                        description: 'Manually created questionnaire',
                        questions_data: this.formElements.map(element => ({
                            text: element.label,
                            fieldType: element.type,
                            fieldOptions: element.options
                        }))
                    })
                });
                
                if (!response.ok) throw new Error('Failed to save form');
                
                const data = await response.json();
                window.location.href = `/questionnaire/${data.id}/`;
                
            } catch (error) {
                alert('Error saving form: ' + error.message);
            }
        },
        
        previewForm() {
            const modal = new bootstrap.Modal(document.getElementById('previewModal'));
            modal.show();
        },

        showPropertiesModal(element) {
            this.editingElement = {...element}; // Clone to avoid direct mutation
            this.propertiesModal = new bootstrap.Modal(document.getElementById('propertiesModal'));
            this.propertiesModal.show();
        },
        
        hidePropertiesModal() {
            if (this.propertiesModal) {
                this.propertiesModal.hide();
                this.editingElement = null;
            }
        },

        createFormElement(type) {
            const element = {
                id: this.nextId++,
                type: type,
                label: 'New Question',
                required: false
            };
          
            // Add type-specific properties
            if (['radio', 'checkbox', 'select'].includes(type)) {
                element.options = ['Option 1'];
            }
            if (type === 'textarea') {
                element.rows = 3;
                element.placeholder = 'Enter your answer here...';
            }
            if (type === 'text') {
                element.placeholder = 'Enter your answer';
            }
          
            return element;
        },

        openSaveModal() {
            const modal = new bootstrap.Modal(document.getElementById('saveFormModal'));
            modal.show();
        },

        async handleSave() {
            if (!this.formName || !this.formDescription) {
                alert('Please fill in all fields');
                return;
            }

            try {
                // Get CSRF token 
                const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
                if (!csrfToken) {
                    throw new Error('CSRF token not found');
                }

                const formData = {
                    name: this.formName,
                    description: this.formDescription,
                    questions_data: this.formElements.map(element => ({
                        text: element.label,
                        fieldType: this.mapElementType(element.type),
                        fieldOptions: this.mapFieldOptions(element)
                    }))
                };

                const response = await fetch(`/questionnaire/create-manual/${this.topicId}/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken.value
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to save form');
                }
                
                const data = await response.json();
                window.location.href = `/questionnaire/${data.id}/`;

            } catch (error) {
                console.error('Save error:', error);
                alert('Error saving form: ' + error.message);
            }
        },

        mapElementType(type) {
            const typeMap = {
                'text': 'Input',
                'textarea': 'Textarea', 
                'radio': 'RadioGroup',
                'select': 'Select',
                'checkbox': 'RadioGroup'
            };
            return typeMap[type] || type;
        },

        mapFieldOptions(element) {
            if (!element.options) return [];
            return element.options.map(opt => ({
                text: opt,
                value: opt.toLowerCase().replace(/\s+/g, '_')
            }));
        }
    },
    computed: {
        activeElement() {
            return this.editingElement;
        }
    },
    watch: {
        formElements: {
            handler() {
                // Force canvas update
                this.$forceUpdate();
            },
            deep: true
        }
    }
});

// Update preview components with v-bind
app.component('radioPreview', {
    props: ['element'],
    template: `
        <div class="mb-3">
            <label class="form-label">{{ element.label }}</label>
            <div v-for="(option, index) in element.options" :key="index" class="form-check">
                <input class="form-check-input" type="radio" :name="'radio-' + element.id" disabled>
                <label class="form-check-label">{{ option }}</label>
            </div>
        </div>
    `
});

app.component('textPreview', {
    props: ['element'],
    template: `
        <div class="mb-3">
            <label class="form-label">{{ element.label }}</label>
            <input type="text" class="form-control" disabled>
        </div>
    `
});

app.component('checkboxPreview', {
    props: ['element'],
    template: `
        <div class="mb-3">
            <label class="form-label">{{ element.label }}</label>
            <div v-for="(option, index) in element.options" :key="index" class="form-check">
                <input class="form-check-input" type="checkbox" disabled>
                <label class="form-check-label">{{ option }}</label>
            </div>
        </div>
    `
});

app.component('selectPreview', {
    props: ['element'],
    template: `
        <div class="mb-3">
            <label class="form-label">{{ element.label }}</label>
            <select class="form-select" disabled>
                <option v-for="(option, index) in element.options" :key="index">{{ option }}</option>
            </select>
        </div>
    `
});

// textarea preview component
app.component('textareaPreview', {
    props: ['element'],
    template: `
        <div class="mb-3">
            <label class="form-label">{{ element.label }}</label>
            <textarea class="form-control" :rows="element.rows" disabled></textarea>
        </div>
    `
});

// Text Input Properties
app.component('textProperties', {
  props: ['element'],
  template: `
    <div class="properties-form">
      <div class="mb-3">
        <label class="form-label">Question Text</label>
        <input type="text" class="form-control" :value="element.label" 
               @input="updateProperty('label', $event.target.value)">
      </div>
      <div class="mb-3">
        <label class="form-label">Placeholder</label>
        <input type="text" class="form-control" :value="element.placeholder"
               @input="updateProperty('placeholder', $event.target.value)">
      </div>
      <div class="mb-3 form-check">
        <input type="checkbox" class="form-check-input" :checked="element.required"
               @change="updateProperty('required', $event.target.checked)">
        <label class="form-check-label">Required</label>
      </div>
    </div>
  `,
  methods: {
    updateProperty(prop, value) {
      this.$emit('update', {...this.element, [prop]: value});
    }
  }
});

// Textarea Properties
app.component('textareaProperties', {
  props: ['element'],
  template: `
    <div class="properties-form">
      <div class="mb-3">
        <label class="form-label">Question Text</label>
        <input type="text" class="form-control" :value="element.label"
               @input="updateProperty('label', $event.target.value)">
      </div>
      <div class="mb-3">
        <label class="form-label">Rows</label>
        <input type="number" class="form-control" :value="element.rows" min="2" max="10"
               @input="updateProperty('rows', $event.target.value)">
      </div>
      <div class="mb-3 form-check">
        <input type="checkbox" class="form-check-input" :checked="element.required"
               @change="updateProperty('required', $event.target.checked)">
        <label class="form-check-label">Required</label>
      </div>
    </div>
  `,
  methods: {
    updateProperty(prop, value) {
      this.$emit('update', {...this.element, [prop]: value});
    }
  }
});

// Radio/Checkbox Properties
app.component('choiceProperties', {
  props: ['element'],
  data() {
    return {
      localOptions: [] // Local copy for reactive updates
    }
  },
  created() {
    this.localOptions = [...(this.element.options || ['Option 1'])]
  },
  template: `
    <div class="properties-form">
      <div class="mb-3">
        <label class="form-label">Question Text</label>
        <input type="text" class="form-control" :value="element.label"
               @input="updateProperty('label', $event.target.value)">
      </div>
      <div class="mb-3">
        <label class="form-label">Options</label>
        <div v-for="(option, index) in localOptions" :key="index" class="input-group mb-2">
          <input type="text" class="form-control" 
                 v-model="localOptions[index]"
                 @input="updateOptions">
          <button class="btn btn-outline-danger" @click="removeOption(index)">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <button class="btn btn-outline-primary btn-sm mt-2" @click="addOption">
          <i class="fas fa-plus"></i> Add Option
        </button>
      </div>
      <div class="mb-3 form-check">
        <input type="checkbox" class="form-check-input" :checked="element.required"
               @change="updateProperty('required', $event.target.checked)">
        <label class="form-check-label">Required</label>
      </div>
    </div>
  `,
  methods: {
    updateProperty(prop, value) {
      this.$emit('update', {...this.element, [prop]: value});
    },
    updateOptions() {
      this.$emit('update', {...this.element, options: [...this.localOptions]});
    },
    removeOption(index) {
      this.localOptions.splice(index, 1);
      this.updateOptions();
    },
    addOption() {
      this.localOptions.push('New Option');
      this.updateOptions();
    }
  }
});

// Select Properties
app.component('selectProperties', {
  props: ['element'],
  data() {
    return {
      localOptions: []
    }
  },
  created() {
    this.localOptions = [...(this.element.options || ['Option 1'])]
  },
  template: `
    <div class="properties-form">
      <div class="mb-3">
        <label class="form-label">Question Text</label>
        <input type="text" class="form-control" :value="element.label"
               @input="updateProperty('label', $event.target.value)">
      </div>
      <div class="mb-3">
        <label class="form-label">Options</label>
        <div v-for="(option, index) in localOptions" :key="index" class="input-group mb-2">
          <input type="text" class="form-control" 
                 v-model="localOptions[index]"
                 @input="updateOptions">
          <button class="btn btn-outline-danger" @click="removeOption(index)">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <button class="btn btn-outline-primary btn-sm mt-2" @click="addOption">
          <i class="fas fa-plus"></i> Add Option
        </button>
      </div>
      <div class="mb-3 form-check">
        <input type="checkbox" class="form-check-input" :checked="element.multiple"
               @change="updateProperty('multiple', $event.target.checked)">
        <label class="form-check-label">Allow Multiple Selection</label>
      </div>
      <div class="mb-3 form-check">
        <input type="checkbox" class="form-check-input" :checked="element.required"
               @change="updateProperty('required', $event.target.checked)">
        <label class="form-check-label">Required</label>
      </div>
    </div>
  `,
  methods: {
    updateProperty(prop, value) {
      this.$emit('update', {...this.element, [prop]: value});
    },
    updateOptions() {
      this.$emit('update', {...this.element, options: [...this.localOptions]});
    },
    removeOption(index) {
      this.localOptions.splice(index, 1);
      this.updateOptions();
    },
    addOption() {
      this.localOptions.push('New Option');
      this.updateOptions();
    }
  }
});

// Textarea form element component
app.component('formTextarea', {
  props: ['element'],
  delimiters: ['[[', ']]'], // Ensure delimiters are set
  template: `
    <div class="form-group mb-3">
      <label class="form-label">[[ element.label ]]</label>
      <textarea 
        class="form-control" 
        :rows="element.rows || 3"
        :placeholder="element.placeholder || 'Enter your answer here...'"
        :required="element.required"
      ></textarea>
    </div>
  `
});

app.component('formSelect', {
  props: ['element'],
  delimiters: ['[[', ']]'],
  template: `
    <div class="form-group mb-3">
      <label class="form-label">[[ element.label ]]</label>
      <select class="form-select" :multiple="element.multiple" :required="element.required">
        <option v-for="(option, index) in element.options" :key="index" :value="option">
          [[ option ]]
        </option>
      </select>
    </div>
  `
});

// Register option-based properties for specific types
app.component('radioProperties', app.component('choiceProperties'));
app.component('checkboxProperties', app.component('choiceProperties'));
app.component('selectProperties', app.component('selectProperties'));

// Register option-based property editors
app.component('radioProperties', app.component('choiceProperties'));
app.component('checkboxProperties', app.component('choiceProperties'));
app.component('selectProperties', app.component('selectProperties'));

// Form Preview Component
app.component('formPreview', {
    props: ['elements'],
    template: `
        <form @submit.prevent class="preview-form">
            <component v-for="(element, index) in elements"
                      :key="index"
                      :is="element.type + 'Preview'"
                      :element="element">
            </component>
        </form>
    `
});

// Add the properties modal to the template
app.component('propertiesModal', {
    props: ['element'],
    template: `
        <div class="modal fade" id="propertiesModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Edit Properties</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <component v-if="element"
                                 :is="element.type + 'Properties'"
                                 :element="element"
                                 @update="updateElement">
                        </component>
                    </div>
                </div>
            </div>
        </div>
    `,
    methods: {
        updateElement(data) {
            this.$emit('update', data);
        }
    }
});

// Add computed property for reactive updates
app.mount('#formBuilder');
