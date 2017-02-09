require('torch')
require('nn')

local MergeSequences, parent = torch.class('nn.MergeSequences', 'nn.Module')

function MergeSequences:__init(name)
    parent.__init(self)
    self.name = name
end

function MergeSequences:updateOutput(input)
    -- Make sure both sequences are the same length
    assert(#(input[1]) == #(input[#input]))

    -- Prepare a new output sequence
    local mergedSequence = {}
    for n=1,#(input[1]) do
        local entry = {}
        for s = 1, #input do
            table.insert(entry, {input[s][n]})
        end
        table.insert(mergedSequence, entry)
    end

    self.output = mergedSequence
    return self.output
end


function MergeSequences:updateGradInput(input, gradOutput)
    -- Break apart the gradients for each entry
    local splitGradients = {}
    for s = 1, #input do
        table.insert(splitGradients, {})
    end

    for n=1,#(input[1]) do
        for s = 1, #input do
            table.insert(splitGradients, {gradOutput[n][s]})
        end
    end

    self.gradInput = splitGradients
    return self.gradInput
end

function MergeSequences:clearState()
    -- don't call set because it might reset referenced tensors
    local function clear(f)
        if self[f] then
            if torch.isTensor(self[f]) then
                self[f] = self[f].new()
            elseif type(self[f]) == 'table' then
                self[f] = {}
            else
                self[f] = nil
            end
        end
    end
    clear('output')
    clear('gradInput')
    return self
end
